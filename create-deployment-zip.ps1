# Pool Safe Inc Portal - Create Deployment ZIP
# This script creates a ZIP file ready for cPanel upload

Write-Host "🏊‍♂️ Pool Safe Inc Portal - Deployment ZIP Creator" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Get the script's directory (project root)
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distPath = Join-Path $projectRoot "frontend\dist"
$zipPath = Join-Path $projectRoot "pool-safe-portal-deployment.zip"

# Check if dist folder exists
if (-not (Test-Path $distPath)) {
    Write-Host "❌ Error: frontend/dist folder not found!" -ForegroundColor Red
    Write-Host "Please run 'npm run build' in the frontend folder first." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if index.html exists
$indexPath = Join-Path $distPath "index.html"
if (-not (Test-Path $indexPath)) {
    Write-Host "❌ Error: index.html not found in dist folder!" -ForegroundColor Red
    Write-Host "Please run 'npm run build' in the frontend folder first." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Remove old ZIP if exists
if (Test-Path $zipPath) {
    Write-Host "🗑️  Removing old deployment ZIP..." -ForegroundColor Yellow
    Remove-Item $zipPath -Force
}

Write-Host "📦 Creating deployment ZIP from frontend/dist..." -ForegroundColor Green
Write-Host ""

# Create ZIP file
try {
    Compress-Archive -Path "$distPath\*" -DestinationPath $zipPath -CompressionLevel Optimal
    
    $zipSize = (Get-Item $zipPath).Length / 1MB
    
    Write-Host "✅ Deployment ZIP created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 File: pool-safe-portal-deployment.zip" -ForegroundColor Cyan
    Write-Host "📊 Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
    Write-Host "📍 Location: $zipPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 Next Steps for cPanel Deployment:" -ForegroundColor Yellow
    Write-Host "  1. Login to your cPanel account" -ForegroundColor White
    Write-Host "  2. Open File Manager" -ForegroundColor White
    Write-Host "  3. Navigate to public_html" -ForegroundColor White
    Write-Host "  4. Upload pool-safe-portal-deployment.zip" -ForegroundColor White
    Write-Host "  5. Right-click the ZIP and select 'Extract'" -ForegroundColor White
    Write-Host "  6. Delete the ZIP file after extraction" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 For detailed instructions, see: CPANEL-DEPLOYMENT-GUIDE.md" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Error creating ZIP file: $_" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Show contents
Write-Host "ZIP Contents:" -ForegroundColor Yellow
Write-Host "  * index.html (main entry point)" -ForegroundColor Green
Write-Host "  * .htaccess (SPA routing config)" -ForegroundColor Green
Write-Host "  * assets/ (CSS, JS, images)" -ForegroundColor Green
Write-Host "  * chunks/ (code splitting)" -ForegroundColor Green
Write-Host "  * favicon.svg, manifest.json, sw.js" -ForegroundColor Green
Write-Host "  * robots.txt, sitemap.xml" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
