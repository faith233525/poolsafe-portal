# Builds the frontend, starts Vite preview on 127.0.0.1:5173, waits until it's reachable,
# runs the Cypress smoke spec, and then cleans up the preview server.

param(
  [int]$Port = 5173,
  [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = 'Stop'

function Wait-For-Http {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  return $false
}

Push-Location "$PSScriptRoot\.."  # go to frontend folder
try {
  # Ensure dependencies if Cypress binary is missing
  $cypressBin = Join-Path (Resolve-Path './node_modules/.bin').Path 'cypress.cmd'
  if (-not (Test-Path $cypressBin)) {
    Write-Host "[e2e] Installing frontend dependencies (Cypress not found)..."
    npm ci --silent
  }
  # Re-resolve after potential install
  $cypressBin = Join-Path (Resolve-Path './node_modules/.bin').Path 'cypress.cmd'

  Write-Host "[e2e] Building frontend..."
  npm run build --silent

  $url = "http://127.0.0.1:$Port"
  Write-Host "[e2e] Starting Vite preview at $url"
  $previewProc = Start-Process -FilePath "cmd.exe" -ArgumentList @('/c','npm','run','preview','--','--port',"$Port",'--strictPort','--host','127.0.0.1') -NoNewWindow -PassThru

  Write-Host "[e2e] Waiting for preview to be reachable..."
  $ok = Wait-For-Http -Url $url -TimeoutSeconds $TimeoutSeconds
  if (-not $ok) {
    Write-Warning "[e2e] Preview did not become reachable within $TimeoutSeconds seconds."
    if ($previewProc -and -not $previewProc.HasExited) { Stop-Process -Id $previewProc.Id -Force -ErrorAction SilentlyContinue }
    exit 1
  }

  Write-Host "[e2e] Running Cypress smoke test..."
  if (Test-Path $cypressBin) {
    & $cypressBin run --browser chrome --spec 'cypress/e2e/smoke.cy.js' --config "baseUrl=$url"
  } else {
    # Fallback to npx if binary still unresolved
    & npm exec -- cypress run --browser chrome --spec 'cypress/e2e/smoke.cy.js' --config "baseUrl=$url"
  }
  $code = $LASTEXITCODE

  Write-Host "[e2e] Cleaning up preview server..."
  try {
    # Try to kill by owning process from port
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conns) {
      $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
      foreach ($procId in $procIds) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
    }
  } catch { }
  if ($previewProc -and -not $previewProc.HasExited) { Stop-Process -Id $previewProc.Id -Force -ErrorAction SilentlyContinue }

  exit $code
} finally {
  Pop-Location
}
