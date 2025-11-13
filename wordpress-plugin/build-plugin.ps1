# Build Plugin ZIP with Credentials
# This script creates the plugin ZIP and injects credentials from .env

$scriptPath = $PSScriptRoot
$pluginDir = Join-Path $scriptPath "wp-poolsafe-portal"
$buildDir = Join-Path $scriptPath "build"
$zipName = "wp-poolsafe-portal-v1.3.0.zip"

# Load .env file from backend
$envPath = Join-Path $scriptPath "..\backend\.env"
if (!(Test-Path $envPath)) {
    Write-Host "ERROR: .env file not found at: $envPath" -ForegroundColor Red
    exit 1
}

Write-Host "Loading credentials from .env..." -ForegroundColor Cyan
$envVars = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        $envVars[$key] = $value
    }
}

# Validate required credentials
$required = @('AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID', 'HUBSPOT_API_KEY')
$missing = $required | Where-Object { -not $envVars.ContainsKey($_) }
if ($missing) {
    Write-Host "ERROR: Missing required credentials in .env: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All required credentials found" -ForegroundColor Green

# Create build directory
if (Test-Path $buildDir) {
    Remove-Item $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDir | Out-Null
$buildPluginDir = Join-Path $buildDir "wp-poolsafe-portal"

# Copy plugin files
Write-Host "Copying plugin files..." -ForegroundColor Cyan
Copy-Item -Path $pluginDir -Destination $buildPluginDir -Recurse -Force

# Process configure-azure.template.php
$templatePath = Join-Path $buildPluginDir "configure-azure.template.php"
$outputPath = Join-Path $buildPluginDir "configure-azure.php"

if (Test-Path $templatePath) {
    Write-Host "Injecting credentials into configure-azure.php..." -ForegroundColor Cyan
    
    $content = Get-Content $templatePath -Raw
    
    # Replace placeholders
    $content = $content -replace '%%AZURE_CLIENT_ID%%', $envVars['AZURE_CLIENT_ID']
    $content = $content -replace '%%AZURE_CLIENT_SECRET%%', $envVars['AZURE_CLIENT_SECRET']
    $content = $content -replace '%%HUBSPOT_API_KEY%%', $envVars['HUBSPOT_API_KEY']
    
    # Update tenant_id line
    $tenantId = $envVars['AZURE_TENANT_ID']
    $content = $content -replace "'tenant_id' => 'common',", "'tenant_id' => '$tenantId',"
    
    # Save processed file
    Set-Content -Path $outputPath -Value $content -NoNewline
    
    # Remove template
    Remove-Item $templatePath -Force
    
    Write-Host "✓ Credentials injected successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING: configure-azure.template.php not found" -ForegroundColor Yellow
}

# Create ZIP
Write-Host "Creating plugin ZIP..." -ForegroundColor Cyan
$zipPath = Join-Path $scriptPath $zipName

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path $buildPluginDir -DestinationPath $zipPath -CompressionLevel Optimal

# Cleanup build directory
Remove-Item $buildDir -Recurse -Force

# Get ZIP size
$zipSize = (Get-Item $zipPath).Length / 1KB
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Plugin ZIP created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Location: $zipPath" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($zipSize, 2)) KB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configured credentials:" -ForegroundColor Yellow
Write-Host "  - Azure Client ID: $($envVars['AZURE_CLIENT_ID'].Substring(0,8))..." -ForegroundColor White
Write-Host "  - Azure Tenant ID: $($envVars['AZURE_TENANT_ID'])" -ForegroundColor White
Write-Host "  - Azure Secret: [HIDDEN]" -ForegroundColor White
Write-Host "  - HubSpot Token: $($envVars['HUBSPOT_API_KEY'].Substring(0,15))..." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Upload $zipName to WordPress" -ForegroundColor White
Write-Host "  2. Activate the plugin" -ForegroundColor White
Write-Host "  3. Visit: wp-content/plugins/wp-poolsafe-portal/configure-azure.php" -ForegroundColor White
Write-Host "  4. Follow on-screen instructions" -ForegroundColor White
Write-Host "  5. Delete configure-azure.php after setup" -ForegroundColor White
Write-Host ""
