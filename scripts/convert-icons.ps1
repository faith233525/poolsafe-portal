# PowerShell script to convert SVG icons to PNG for PWA manifest compliance
# Requires ImageMagick installed: winget install ImageMagick.ImageMagick

$assetsPath = Join-Path $PSScriptRoot "..\frontend\public\assets"
Set-Location $assetsPath

Write-Host "Converting SVG icons to PNG for PWA..." -ForegroundColor Cyan

# Icon sizes needed for manifest.json
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)

# Check if ImageMagick is available
$magickCmd = Get-Command magick -ErrorAction SilentlyContinue

if (-not $magickCmd) {
    Write-Host "ERROR: ImageMagick not found." -ForegroundColor Red
    Write-Host "Please install ImageMagick:" -ForegroundColor Yellow
    Write-Host "  winget install ImageMagick.ImageMagick" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use online converter:" -ForegroundColor Yellow
    Write-Host "  https://cloudconvert.com/svg-to-png" -ForegroundColor Yellow
    Write-Host "  https://svgtopng.com/" -ForegroundColor Yellow
    exit 1
}

foreach ($size in $sizes) {
    Write-Host "Generating icon-$size`x$size.png..." -ForegroundColor Green
    & magick convert -background none -resize "$size`x$size" `
        "loungenie-logo.svg" "icon-$size`x$size.png"
}

# Generate favicon sizes
Write-Host "Generating favicon-16x16.png..." -ForegroundColor Green
& magick convert -background none -resize "16x16" "loungenie-logo.svg" "favicon-16x16.png"

Write-Host "Generating favicon-32x32.png..." -ForegroundColor Green
& magick convert -background none -resize "32x32" "loungenie-logo.svg" "favicon-32x32.png"

Write-Host "Generating apple-touch-icon.png..." -ForegroundColor Green
& magick convert -background none -resize "180x180" "loungenie-logo.svg" "apple-touch-icon.png"

Write-Host ""
Write-Host "✓ PNG icon generation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Generated files:" -ForegroundColor Cyan
Get-ChildItem -Filter "*.png" | Select-Object Name, Length | Format-Table -AutoSize
