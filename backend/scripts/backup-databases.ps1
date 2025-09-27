# Backup all SQLite databases in backend/prisma to a timestamped backup folder
# Usage: Run this script from the project root or backend folder

$SourceDir = "backend\prisma"
$BackupRoot = "backend\prisma\backups"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = "$BackupRoot\$Timestamp"

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Copy all .db files to backup directory
Get-ChildItem -Path $SourceDir -Filter "*.db" | ForEach-Object {
    Copy-Item $_.FullName -Destination $BackupDir
}

Write-Host "Backup complete. Databases saved to $BackupDir"