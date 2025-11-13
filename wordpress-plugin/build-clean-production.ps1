# Build Clean Production ZIP
# Excludes: .old files, credentials, templates, git files, dev files

$scriptPath = $PSScriptRoot
$pluginDir = Join-Path $scriptPath "wp-poolsafe-portal"
$buildDir = Join-Path $scriptPath "build-clean"
$zipName = "wp-poolsafe-portal.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Clean Production Plugin ZIP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Files/folders to exclude from production
$excludePatterns = @(
    '*.old',
    '*.bak',
    '*.disabled',
    '.git*',
    'YOUR-CREDENTIALS.md',
    '*-CREDENTIALS-*.md',
    'configure-azure.template.php',
    'WP-CONFIG-CREDENTIALS.php',
    'check-config.php',
    '.env*',
    'wp-config-local.php',
    'node_modules',
    'vendor',
    'dist',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '.idea',
    '.vscode'
)

# Create build directory
if (Test-Path $buildDir) {
    Remove-Item $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDir | Out-Null
$buildPluginDir = Join-Path $buildDir "wp-poolsafe-portal"
New-Item -ItemType Directory -Path $buildPluginDir | Out-Null

Write-Host "Copying plugin files..." -ForegroundColor Yellow

# Copy all files except excluded patterns
Get-ChildItem -Path $pluginDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($pluginDir.Length + 1)
    
    # Check if file/folder matches any exclude pattern
    $isExcluded = $false
    foreach ($pattern in $excludePatterns) {
        if ($_.Name -like $pattern -or $relativePath -like "*\$pattern" -or $relativePath -like "$pattern\*") {
            $isExcluded = $true
            break
        }
    }
    
    if (-not $isExcluded) {
        $destination = Join-Path $buildPluginDir $relativePath
        
        if ($_.PSIsContainer) {
            if (-not (Test-Path $destination)) {
                New-Item -ItemType Directory -Path $destination -Force | Out-Null
            }
        } else {
            $destDir = Split-Path $destination -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -Path $_.FullName -Destination $destination -Force
        }
    }
}

Write-Host "✓ Files copied" -ForegroundColor Green

# Verify critical files are present
Write-Host ""
Write-Host "Verifying plugin structure..." -ForegroundColor Yellow

$criticalFiles = @(
    'wp-poolsafe-portal.php',
    'readme.txt',
    'includes\class-psp-plugin.php',
    'includes\class-psp-azure-ad.php',
    'includes\class-psp-setup-wizard.php',
    'includes\class-psp-frontend.php',
    'includes\class-psp-hubspot.php',
    'includes\class-psp-email-to-ticket.php'
)

$allPresent = $true
foreach ($file in $criticalFiles) {
    $fullPath = Join-Path $buildPluginDir $file
    if (Test-Path $fullPath) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
        $allPresent = $false
    }
}

if (-not $allPresent) {
    Write-Host ""
    Write-Host "ERROR: Critical files missing!" -ForegroundColor Red
    Remove-Item $buildDir -Recurse -Force
    exit 1
}

# Verify .old files are NOT present
Write-Host ""
Write-Host "Verifying exclusions..." -ForegroundColor Yellow

$oldFiles = Get-ChildItem -Path $buildPluginDir -Recurse -Filter "*.old" -ErrorAction SilentlyContinue
if ($oldFiles) {
    Write-Host "  [ERROR] Found .old files (should be excluded):" -ForegroundColor Red
    $oldFiles | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Red }
    Remove-Item $buildDir -Recurse -Force
    exit 1
} else {
    Write-Host "  [OK] No .old files" -ForegroundColor Green
}

$credFiles = Get-ChildItem -Path $buildPluginDir -Recurse -Include "*CREDENTIALS*","*.template.php","check-config.php" -ErrorAction SilentlyContinue
if ($credFiles) {
    Write-Host "  [ERROR] Found credential/template files (should be excluded):" -ForegroundColor Red
    $credFiles | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Red }
    Remove-Item $buildDir -Recurse -Force
    exit 1
} else {
    Write-Host "  [OK] No credential templates" -ForegroundColor Green
}

Write-Host "  [OK] All exclusions verified" -ForegroundColor Green

# Create ZIP
Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow

$zipPath = Join-Path $scriptPath $zipName

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path $buildPluginDir -DestinationPath $zipPath -CompressionLevel Optimal

# Cleanup build directory
Remove-Item $buildDir -Recurse -Force

# Get ZIP info
$zipSize = (Get-Item $zipPath).Length / 1KB
$fileCount = (Get-ChildItem -Path $pluginDir -Recurse -File | Measure-Object).Count
$includedCount = $fileCount - ($excludePatterns.Count * 2) # Rough estimate

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ CLEAN PRODUCTION ZIP CREATED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Location: $zipPath" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($zipSize, 2)) KB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Excluded from ZIP:" -ForegroundColor Yellow
Write-Host "  - *.old files (3 old email system classes)" -ForegroundColor White
Write-Host "  - Git files (.git, .gitignore, .github)" -ForegroundColor White
Write-Host "  - Credential templates and helpers" -ForegroundColor White
Write-Host "  - Development files (.vscode, .idea, logs)" -ForegroundColor White
Write-Host ""
Write-Host "What's IN the ZIP:" -ForegroundColor Yellow
Write-Host "  + All active plugin classes" -ForegroundColor Green
Write-Host "  + Azure AD OAuth SSO (class-psp-azure-ad.php)" -ForegroundColor Green
Write-Host "  + Setup Wizard (class-psp-setup-wizard.php)" -ForegroundColor Green
Write-Host "  + Auto-config helper (class-psp-auto-config.php)" -ForegroundColor Green
Write-Host "  + Email-to-ticket + Response tracking" -ForegroundColor Green
Write-Host "  + HubSpot integration (updated priorities)" -ForegroundColor Green
Write-Host "  + Enhanced frontend (64px unit display)" -ForegroundColor Green
Write-Host "  + All documentation (MD files)" -ForegroundColor Green
Write-Host "  + Assets (CSS, JS, images)" -ForegroundColor Green
Write-Host ""
Write-Host "Ready for WordPress upload!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Upload $zipName to WordPress" -ForegroundColor White
Write-Host "  2. Activate plugin (auto-redirects to Setup Wizard)" -ForegroundColor White
Write-Host "  3. Complete 4 tabs (credentials, test connections)" -ForegroundColor White
Write-Host "  4. Configure external systems (Azure Portal, Power Automate)" -ForegroundColor White
Write-Host "  5. Test all features using PRE-DEPLOYMENT-TEST.md" -ForegroundColor White
Write-Host ""
