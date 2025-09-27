#!/bin/bash

# Pool Safe Inc Portal - Backup Script
# Automated backup of database and critical files

set -e

# Configuration
BACKUP_DIR="/var/backups/poolsafe"
APP_DIR="/var/www/poolsafe-portal"
MAX_BACKUPS=7  # Keep 7 days of backups
DATE=$(date +%Y%m%d-%H%M%S)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Starting Pool Safe Inc Portal Backup${NC}"
echo "========================================"
echo "Backup started at: $(date)"
echo ""

# Create backup directory
sudo mkdir -p "$BACKUP_DIR"

# Backup database
echo -e "${BLUE}📦 Backing up database...${NC}"
# Attempt to source backend env for DATABASE_URL
if [ -f "$APP_DIR/backend/.env" ]; then
    set -a; source "$APP_DIR/backend/.env" 2>/dev/null || true; set +a
fi
if [[ "$DATABASE_URL" == postgresql://* || "$DATABASE_URL" == postgres://* ]]; then
    # Postgres backup using pg_dump
    if command -v pg_dump >/dev/null 2>&1; then
        sudo -E bash -c "PGPASSWORD='$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')' pg_dump --dbname=\"$DATABASE_URL\" | gzip > '$BACKUP_DIR/database-$DATE.sql.gz'"
        echo -e "${GREEN}✅ Postgres backup created: database-$DATE.sql.gz${NC}"
    else
        echo -e "${YELLOW}⚠️  pg_dump not found; skipping Postgres backup. Install postgresql-client.${NC}"
    fi
elif [ -f "$APP_DIR/backend/prisma/production.db" ]; then
    # SQLite fallback (legacy)
    sudo cp "$APP_DIR/backend/prisma/production.db" "$BACKUP_DIR/database-$DATE.db"
    echo -e "${GREEN}✅ SQLite database backup created: database-$DATE.db${NC}"
else
    echo -e "${YELLOW}⚠️  No database backup performed (missing DATABASE_URL and SQLite file)${NC}"
fi

# Backup environment files
echo -e "${BLUE}📦 Backing up configuration...${NC}"
if [ -f "$APP_DIR/backend/.env" ]; then
    sudo cp "$APP_DIR/backend/.env" "$BACKUP_DIR/env-$DATE.backup"
    echo -e "${GREEN}✅ Environment backup created: env-$DATE.backup${NC}"
fi

# Backup uploads directory
echo -e "${BLUE}📦 Backing up uploaded files...${NC}"
if [ -d "$APP_DIR/backend/uploads" ]; then
    sudo tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" -C "$APP_DIR/backend" uploads/
    echo -e "${GREEN}✅ Uploads backup created: uploads-$DATE.tar.gz${NC}"
fi

# Backup Nginx configuration
echo -e "${BLUE}📦 Backing up Nginx config...${NC}"
if [ -f "/etc/nginx/sites-available/poolsafe" ]; then
    sudo cp "/etc/nginx/sites-available/poolsafe" "$BACKUP_DIR/nginx-$DATE.conf"
    echo -e "${GREEN}✅ Nginx config backup created: nginx-$DATE.conf${NC}"
fi

# Backup PM2 configuration
echo -e "${BLUE}📦 Backing up PM2 config...${NC}"
if [ -f "/home/$USER/.pm2/dump.pm2" ]; then
    sudo cp "/home/$USER/.pm2/dump.pm2" "$BACKUP_DIR/pm2-$DATE.json"
    echo -e "${GREEN}✅ PM2 config backup created: pm2-$DATE.json${NC}"
fi

# Create backup manifest
echo -e "${BLUE}📦 Creating backup manifest...${NC}"
sudo tee "$BACKUP_DIR/manifest-$DATE.txt" > /dev/null << EOF
Pool Safe Inc Portal Backup Manifest
Generated: $(date)
Server: $(hostname)
Backup Directory: $BACKUP_DIR

Files in this backup:
- database-$DATE.db (SQLite database)
- env-$DATE.backup (Environment configuration)
- uploads-$DATE.tar.gz (User uploaded files)
- nginx-$DATE.conf (Nginx configuration)
- pm2-$DATE.json (PM2 process configuration)

System Information:
- OS: $(lsb_release -d | cut -f2)
- Kernel: $(uname -r)
- Node.js: $(node --version)
- Disk Usage: $(df -h / | awk 'NR==2 {print $5}')
- Memory Usage: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')

Application Status:
- Backend Status: $(pm2 describe poolsafe-backend 2>/dev/null | grep -o "status.*online" || echo "unknown")
- Nginx Status: $(systemctl is-active nginx || echo "unknown")
- Database Target: ${DATABASE_URL:-sqlite-file}
- Database Size: $(du -h "$APP_DIR/backend/prisma/production.db" 2>/dev/null | cut -f1 || ls -lh "$BACKUP_DIR/database-$DATE.sql.gz" 2>/dev/null | awk '{print $5}' || echo "unknown")

Restore Instructions:
1. Stop services: pm2 stop poolsafe-backend && sudo systemctl stop nginx
2. Restore environment: cp env-$DATE.backup /var/www/poolsafe-portal/backend/.env
3. Restore database:
    - Postgres: gunzip -c database-$DATE.sql.gz | psql "$DATABASE_URL"
    - SQLite: cp database-$DATE.db /var/www/poolsafe-portal/backend/prisma/production.db
4. Restore uploads: tar -xzf uploads-$DATE.tar.gz -C /var/www/poolsafe-portal/backend/
5. Restore configs and restart services
EOF

echo -e "${GREEN}✅ Backup manifest created: manifest-$DATE.txt${NC}"

# Cleanup old backups
echo -e "${BLUE}🧹 Cleaning up old backups...${NC}"
find "$BACKUP_DIR" -name "database-*.db" -type f -mtime +$MAX_BACKUPS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "env-*.backup" -type f -mtime +$MAX_BACKUPS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -type f -mtime +$MAX_BACKUPS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "nginx-*.conf" -type f -mtime +$MAX_BACKUPS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "pm2-*.json" -type f -mtime +$MAX_BACKUPS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "manifest-*.txt" -type f -mtime +$MAX_BACKUPS -delete 2>/dev/null || true

echo -e "${GREEN}✅ Old backups cleaned up (keeping $MAX_BACKUPS days)${NC}"

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo "=================================="
echo "Backup location: $BACKUP_DIR"
echo "Backup size: $BACKUP_SIZE"
echo "Files backed up:"
ls -la "$BACKUP_DIR"/*-$DATE.* 2>/dev/null | awk '{print "  " $9 " (" $5 " bytes)"}'
echo ""
echo "To restore from this backup, run:"
echo "  ./deploy/restore-backup.sh $DATE"