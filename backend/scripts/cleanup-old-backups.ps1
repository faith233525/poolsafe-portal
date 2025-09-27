# Cleanup old backup folders, keeping only the most recent N backups
# Usage: Run this script from the project root or backend folder

$BackupRoot = "backend\prisma\backups"
$RetentionCount = 10  # Number of recent backups to keep

# Get all backup folders sorted by creation time (descending)
$folders = Get-ChildItem -Path $BackupRoot -Directory | Sort-Object CreationTime -Descending

if ($folders.Count -gt $RetentionCount) {
    $foldersToDelete = $folders[$RetentionCount..($folders.Count - 1)]
    foreach ($folder in $foldersToDelete) {
        Remove-Item -Path $folder.FullName -Recurse -Force
        Write-Host "Deleted old backup: $($folder.FullName)"
    }
} else {
    Write-Host "No old backups to delete. Total backups: $($folders.Count)"
}
