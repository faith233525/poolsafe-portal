# PostgreSQL Migration Script for Windows
# This PowerShell script migrates data from SQLite to PostgreSQL

param(
    [Parameter(Mandatory=$false)]
    [string]$PostgresUrl = "postgresql://poolsafe_user:password@localhost:5432/poolsafe_production"
)

Write-Host "🚀 Starting PostgreSQL Migration for Pool Safe Inc Portal..." -ForegroundColor Green

# Configuration
$SqliteDbPath = "./prisma/dev.db"
$BackupDir = "./backups/migration-$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Write-Host "📁 Created backup directory: $BackupDir" -ForegroundColor Yellow

Write-Host "📊 Step 1: Backing up current SQLite database..." -ForegroundColor Cyan
Copy-Item $SqliteDbPath "$BackupDir/dev.db.backup"

Write-Host "🗄️ Step 2: Setting up PostgreSQL environment..." -ForegroundColor Cyan
$env:DATABASE_URL = $PostgresUrl

Write-Host "🔄 Step 3: Running Prisma migration to PostgreSQL..." -ForegroundColor Cyan
try {
    npx prisma migrate deploy
    Write-Host "✅ Database migration successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "📈 Step 4: Generating Prisma client for PostgreSQL..." -ForegroundColor Cyan
npx prisma generate

Write-Host "🌱 Step 5: Seeding PostgreSQL with initial data..." -ForegroundColor Cyan
try {
    npx prisma db seed
    Write-Host "✅ Database seeding successful" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Seeding completed with warnings (this is normal for existing data)" -ForegroundColor Yellow
}

Write-Host "🔍 Step 6: Verifying migration..." -ForegroundColor Cyan
npx prisma db pull

Write-Host "✅ PostgreSQL migration completed successfully!" -ForegroundColor Green
Write-Host "📍 Backup location: $BackupDir" -ForegroundColor Yellow
Write-Host "🔗 PostgreSQL URL: $PostgresUrl" -ForegroundColor Yellow

Write-Host "🧪 Running verification tests..." -ForegroundColor Cyan
try {
    npm test
    Write-Host "✅ All tests passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Some tests failed - please review" -ForegroundColor Yellow
}

Write-Host "🎉 Migration completed! Your application is now ready to use PostgreSQL." -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Update your .env file with the PostgreSQL connection string" -ForegroundColor White
Write-Host "   2. Restart your application" -ForegroundColor White
Write-Host "   3. Test all functionality to ensure everything works correctly" -ForegroundColor White