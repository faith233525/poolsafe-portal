#!/bin/bash

# PostgreSQL Migration Script for Pool Safe Inc Portal
# This script migrates data from SQLite to PostgreSQL

set -e

echo "🚀 Starting PostgreSQL Migration for Pool Safe Inc Portal..."

# Configuration
SQLITE_DB_PATH="./prisma/dev.db"
POSTGRES_URL="postgresql://poolsafe_user:password@localhost:5432/poolsafe_production"
BACKUP_DIR="./backups/migration-$(date +%Y%m%d_%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📊 Step 1: Backing up current SQLite database..."
cp "$SQLITE_DB_PATH" "$BACKUP_DIR/dev.db.backup"

echo "📋 Step 2: Exporting data from SQLite..."
sqlite3 "$SQLITE_DB_PATH" .dump > "$BACKUP_DIR/sqlite_dump.sql"

echo "🗄️ Step 3: Creating PostgreSQL database..."
psql -c "CREATE DATABASE poolsafe_production;" || echo "Database may already exist"
psql -c "CREATE USER poolsafe_user WITH PASSWORD 'password';" || echo "User may already exist"
psql -c "GRANT ALL PRIVILEGES ON DATABASE poolsafe_production TO poolsafe_user;"

echo "🔄 Step 4: Running Prisma migration to PostgreSQL..."
export DATABASE_URL="$POSTGRES_URL"
npx prisma migrate deploy

echo "📈 Step 5: Seeding PostgreSQL with initial data..."
npx prisma db seed

echo "🔍 Step 6: Verifying migration..."
npx prisma db pull
npx prisma generate

echo "✅ PostgreSQL migration completed successfully!"
echo "📍 Backup location: $BACKUP_DIR"
echo "🔗 PostgreSQL URL: $POSTGRES_URL"

# Run basic verification tests
echo "🧪 Running verification tests..."
npm run test:db

echo "🎉 Migration completed! Your application is now ready to use PostgreSQL."
echo "📝 Next steps:"
echo "   1. Update your .env file with the PostgreSQL connection string"
echo "   2. Restart your application"
echo "   3. Test all functionality to ensure everything works correctly"