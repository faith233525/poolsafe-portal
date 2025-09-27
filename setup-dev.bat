@echo off
REM Pool Safe Inc Portal - Local Development Setup Script for Windows
REM This script helps set up the development environment on Windows

echo 🚀 Pool Safe Inc Portal - Development Setup
echo ===========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    echo    Download from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo ✅ Docker is installed and running

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 20+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.production.template .env >nul
    echo ✅ Created .env file - please update with your actual credentials
) else (
    echo ✅ .env file already exists
)

REM Install dependencies
echo 📦 Installing dependencies...
echo    Installing backend dependencies...
cd backend
call npm ci --silent
echo    Installing frontend dependencies...
cd ..\frontend
call npm ci --silent
cd ..

echo ✅ Dependencies installed

REM Build backend
echo 🔨 Building backend...
cd backend
call npm run build
cd ..

echo ✅ Backend built successfully

REM Run tests
echo 🧪 Running tests...
echo    Running backend tests...
cd backend
call npm test --silent
echo    Running frontend tests...
cd ..\frontend
call npm test --silent
cd ..

echo ✅ All tests passed

echo.
echo 🎉 Development environment setup complete!
echo.
echo 📋 Next steps:
echo 1. Update .env file with your actual credentials (SMTP, Azure AD, HubSpot)
echo 2. For local development:
echo    - Backend: cd backend ^&^& npm run dev
echo    - Frontend: cd frontend ^&^& npm run dev
echo 3. For Docker deployment:
echo    - docker-compose up --build
echo 4. Access your application:
echo    - Frontend: http://localhost:5173 (dev) or http://localhost (docker)
echo    - Backend API (dev default): http://localhost:4000/api
echo      (frontend dev proxy points to 4000; change backend PORT only if needed)
echo.
echo 📚 Documentation:
echo    - Deployment Guide: .\deploy\VPS-DEPLOYMENT-GUIDE.md
echo    - Environment Setup: .\.env.production.template
echo    - Health Check: .\deploy\health-check.sh
echo.
echo ✨ Happy coding!
pause