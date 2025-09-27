# Simple backend health check for Windows PowerShell
param(
  [int]$Port = 4000
)

Write-Host "Checking backend health on port $Port..." -ForegroundColor Cyan
$url = "http://localhost:$Port/api/health"

try {
  $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
  Write-Host "Status: $($res.StatusCode)" -ForegroundColor Green
  Write-Host "Body: $($res.Content)"
  exit 0
}
catch {
  Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
