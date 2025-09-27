#!/bin/bash
# Production Backend Startup Script

echo "🚀 Starting Pool Safe Inc Portal Backend in Production Mode..."

# Set production environment
export NODE_ENV=production
export PORT=4000

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  Warning: .env.production file not found!"
    echo "📋 Please copy PRODUCTION.env.template to .env.production and configure it"
    exit 1
fi

# Load production environment
source .env.production

# Check database connection
echo "🔍 Checking database connection..."
npx prisma migrate status

if [ $? -ne 0 ]; then
    echo "❌ Database migration check failed!"
    echo "📋 Run: npx prisma migrate deploy"
    exit 1
fi

# Generate Prisma client for production
echo "🔧 Generating Prisma client..."
npx prisma generate

# Start the production server
echo "✅ Starting production server on port $PORT..."
node dist/index.js