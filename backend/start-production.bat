@echo off
REM Production Backend Startup Script for Windows

echo 🚀 Starting Pool Safe Inc Portal Backend in Production Mode...

REM Set production environment
set NODE_ENV=production
set PORT=4000

REM Check if production environment file exists
if not exist ".env.production" (
    echo ⚠️  Warning: .env.production file not found!
    echo 📋 Please copy PRODUCTION.env.template to .env.production and configure it
    exit /b 1
)

REM Check database connection
echo 🔍 Checking database connection...
npx prisma migrate status

if %errorlevel% neq 0 (
    echo ❌ Database migration check failed!
    echo 📋 Run: npx prisma migrate deploy
    exit /b 1
)

REM Generate Prisma client for production
echo 🔧 Generating Prisma client...
npx prisma generate

REM Start the production server
echo ✅ Starting production server on port %PORT%...
node dist/index.js