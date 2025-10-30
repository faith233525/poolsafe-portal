Param(
  [int]$Iterations = 5,
  [string]$BackendPath = "../backend",
  [string]$FrontendPath = "../frontend"
)

# Resolve absolute paths relative to this script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Resolve-Path -Path (Join-Path $ScriptDir $BackendPath)
$FrontendDir = Resolve-Path -Path (Join-Path $ScriptDir $FrontendPath)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogDir = Join-Path $ScriptDir "../logs"
$null = New-Item -ItemType Directory -Path $LogDir -Force -ErrorAction SilentlyContinue
$LogFile = Join-Path $LogDir "test-runs-$timestamp.log"

$backendPass = 0
$backendFail = 0
$frontendPass = 0
$frontendFail = 0

"Starting test loop: Iterations=$Iterations" | Tee-Object -FilePath $LogFile -Append | Out-Null
"Backend: $BackendDir" | Tee-Object -FilePath $LogFile -Append | Out-Null
"Frontend: $FrontendDir" | Tee-Object -FilePath $LogFile -Append | Out-Null

for ($i = 1; $i -le $Iterations; $i++) {
  $runStamp = Get-Date -Format "u"
  "\n=== RUN $i/$Iterations at $runStamp ===" | Tee-Object -FilePath $LogFile -Append | Out-Null

  Push-Location $BackendDir
  try {
    "[Backend] Iteration ${i}: npm test" | Tee-Object -FilePath $LogFile -Append | Out-Null
  $backendOutput = & npm.cmd run -s test 2>&1
    $backendExitCode = $LASTEXITCODE
    $backendOutput | Tee-Object -FilePath $LogFile -Append | Out-Null
    if ($backendExitCode -eq 0) { $backendPass++ } else { $backendFail++ }
  } finally { Pop-Location }

  Push-Location $FrontendDir
  try {
    "[Frontend] Iteration ${i}: npm test" | Tee-Object -FilePath $LogFile -Append | Out-Null
  $frontendOutput = & npm.cmd run -s test 2>&1
    $frontendExitCode = $LASTEXITCODE
    $frontendOutput | Tee-Object -FilePath $LogFile -Append | Out-Null
    if ($frontendExitCode -eq 0) { $frontendPass++ } else { $frontendFail++ }
  } finally { Pop-Location }
}

"\n=== SUMMARY ===" | Tee-Object -FilePath $LogFile -Append | Out-Null
"Backend: Pass=$backendPass Fail=$backendFail" | Tee-Object -FilePath $LogFile -Append | Out-Null
"Frontend: Pass=$frontendPass Fail=$frontendFail" | Tee-Object -FilePath $LogFile -Append | Out-Null

Write-Host "Done. Log: $LogFile"
