#!/bin/bash

# Pool Safe Inc Portal - Restore Backup Script
# Restores application from backup files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/var/backups/poolsafe"
APP_DIR="/var/www/poolsafe-portal"

echo -e "${BLUE}🔄 Pool Safe Inc Portal - Backup Restore${NC}"
echo "========================================"
echo ""

# Check if backup date provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide a backup date${NC}"
    echo "Usage: $0 YYYYMMDD-HHMMSS"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/manifest-*.txt 2>/dev/null | awk '{print $9}' | sed 's/.*manifest-\(.*\)\.txt/  \1/' || echo "  No backups found"
    exit 1
fi

BACKUP_DATE=$1

# Check if backup exists
if [ ! -f "$BACKUP_DIR/manifest-$BACKUP_DATE.txt" ]; then
    echo -e "${RED}❌ Backup not found: $BACKUP_DATE${NC}"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/manifest-*.txt 2>/dev/null | awk '{print $9}' | sed 's/.*manifest-\(.*\)\.txt/  \1/' || echo "  No backups found"
    exit 1
fi

# Show backup information
echo -e "${BLUE}📋 Backup Information${NC}"
echo "--------------------"
cat "$BACKUP_DIR/manifest-$BACKUP_DATE.txt" | head -20
echo ""

# Confirmation
read -p "Are you sure you want to restore from backup $BACKUP_DATE? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  Starting restore process...${NC}"

# Create pre-restore backup
echo -e "${BLUE}💾 Creating pre-restore backup...${NC}"
PRE_RESTORE_DATE=$(date +%Y%m%d-%H%M%S)
if [ -f "$APP_DIR/backend/prisma/production.db" ]; then
    sudo cp "$APP_DIR/backend/prisma/production.db" "$BACKUP_DIR/pre-restore-$PRE_RESTORE_DATE.db"
    echo -e "${GREEN}✅ Current database backed up to pre-restore-$PRE_RESTORE_DATE.db${NC}"
fi

# Stop services
echo -e "${BLUE}⏹️  Stopping services...${NC}"
pm2 stop poolsafe-backend 2>/dev/null || echo "  Backend not running"
sudo systemctl stop nginx 2>/dev/null || echo "  Nginx not running"
echo -e "${GREEN}✅ Services stopped${NC}"

# Restore database
echo -e "${BLUE}📦 Restoring database...${NC}"
if [ -f "$BACKUP_DIR/database-$BACKUP_DATE.db" ]; then
    sudo cp "$BACKUP_DIR/database-$BACKUP_DATE.db" "$APP_DIR/backend/prisma/production.db"
    sudo chown $USER:$USER "$APP_DIR/backend/prisma/production.db"
    echo -e "${GREEN}✅ Database restored${NC}"
else
    echo -e "${YELLOW}⚠️  Database backup not found, skipping${NC}"
fi

# Restore environment
echo -e "${BLUE}📦 Restoring environment configuration...${NC}"
if [ -f "$BACKUP_DIR/env-$BACKUP_DATE.backup" ]; then
    sudo cp "$BACKUP_DIR/env-$BACKUP_DATE.backup" "$APP_DIR/.env.production"
    sudo chown $USER:$USER "$APP_DIR/.env.production"
    echo -e "${GREEN}✅ Environment configuration restored${NC}"
else
    echo -e "${YELLOW}⚠️  Environment backup not found, skipping${NC}"
fi

# Restore uploads
echo -e "${BLUE}📦 Restoring uploaded files...${NC}"
if [ -f "$BACKUP_DIR/uploads-$BACKUP_DATE.tar.gz" ]; then
    # Backup current uploads if they exist
    if [ -d "$APP_DIR/backend/uploads" ]; then
        sudo mv "$APP_DIR/backend/uploads" "$APP_DIR/backend/uploads-backup-$PRE_RESTORE_DATE"
    fi
    sudo tar -xzf "$BACKUP_DIR/uploads-$BACKUP_DATE.tar.gz" -C "$APP_DIR/backend/"
    sudo chown -R $USER:$USER "$APP_DIR/backend/uploads"
    echo -e "${GREEN}✅ Uploaded files restored${NC}"
else
    echo -e "${YELLOW}⚠️  Uploads backup not found, skipping${NC}"
fi

# Restore Nginx configuration
echo -e "${BLUE}📦 Restoring Nginx configuration...${NC}"
if [ -f "$BACKUP_DIR/nginx-$BACKUP_DATE.conf" ]; then
    sudo cp "$BACKUP_DIR/nginx-$BACKUP_DATE.conf" "/etc/nginx/sites-available/poolsafe"
    # Test Nginx configuration
    if sudo nginx -t 2>/dev/null; then
        echo -e "${GREEN}✅ Nginx configuration restored and validated${NC}"
    else
        echo -e "${RED}❌ Nginx configuration invalid, restore may have issues${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Nginx backup not found, skipping${NC}"
fi

# Restore PM2 configuration
echo -e "${BLUE}📦 Restoring PM2 configuration...${NC}"
if [ -f "$BACKUP_DIR/pm2-$BACKUP_DATE.json" ]; then
    sudo cp "$BACKUP_DIR/pm2-$BACKUP_DATE.json" "/home/$USER/.pm2/dump.pm2"
    sudo chown $USER:$USER "/home/$USER/.pm2/dump.pm2"
    echo -e "${GREEN}✅ PM2 configuration restored${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 backup not found, skipping${NC}"
fi

# Regenerate Prisma client
echo -e "${BLUE}🔧 Regenerating Prisma client...${NC}"
cd "$APP_DIR/backend"
npx prisma generate
echo -e "${GREEN}✅ Prisma client regenerated${NC}"

# Start services
echo -e "${BLUE}▶️  Starting services...${NC}"
sudo systemctl start nginx
pm2 resurrect 2>/dev/null || pm2 start npm --name "poolsafe-backend" -- start
echo -e "${GREEN}✅ Services started${NC}"

# Health check
echo -e "${BLUE}🏥 Running health check...${NC}"
sleep 5

# Check if services are running
if systemctl is-active --quiet nginx && pm2 describe poolsafe-backend &>/dev/null; then
    echo -e "${GREEN}✅ Services are running${NC}"
    
    # Check if application responds
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Application may not be fully ready yet${NC}"
    fi
    
    if curl -f http://localhost >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend may not be fully ready yet${NC}"
    fi
else
    echo -e "${RED}❌ Some services failed to start${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Restore completed!${NC}"
echo "==================="
echo "Backup restored from: $BACKUP_DATE"
echo "Pre-restore backup created: pre-restore-$PRE_RESTORE_DATE"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Verify application is working correctly"
echo "2. Check logs: pm2 logs poolsafe-backend"
echo "3. Run full health check: ./deploy/health-check.sh"
echo ""
echo -e "${YELLOW}⚠️  If there are issues:${NC}"
echo "• Check service logs: pm2 logs poolsafe-backend"
echo "• Check Nginx logs: sudo journalctl -u nginx -f"
echo "• Rollback: ./deploy/restore-backup.sh pre-restore-$PRE_RESTORE_DATE"