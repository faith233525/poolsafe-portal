#!/bin/bash

# Pool Safe Inc Portal - Local Development Setup Script
# This script helps set up the development environment on Windows/WSL or Linux

set -e

echo "🚀 Pool Safe Inc Portal - Development Setup"
echo "============================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is installed and running"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20+ required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) is installed"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.production.template .env
    echo "✅ Created .env file - please update with your actual credentials"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
echo "   Installing backend dependencies..."
cd backend
npm ci --silent
echo "   Installing frontend dependencies..."
cd ../frontend
npm ci --silent
cd ..

echo "✅ Dependencies installed"

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build
cd ..

echo "✅ Backend built successfully"

# Run tests
echo "🧪 Running tests..."
echo "   Running backend tests..."
cd backend
npm test --silent
echo "   Running frontend tests..."
cd ../frontend
npm test --silent
cd ..

echo "✅ All tests passed"

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your actual credentials (SMTP, Azure AD, HubSpot)"
echo "2. For local development:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
echo "3. For Docker deployment:"
echo "   - docker-compose up --build"
echo "4. Access your application:"
echo "   - Frontend: http://localhost:5173 (dev) or http://localhost (docker)"
echo "   - Backend API: http://localhost:3000/api"
echo ""
echo "📚 Documentation:"
echo "   - Deployment Guide: ./deploy/VPS-DEPLOYMENT-GUIDE.md"
echo "   - Environment Setup: ./.env.production.template"
echo "   - Health Check: ./deploy/health-check.sh"
echo ""
echo "✨ Happy coding!"