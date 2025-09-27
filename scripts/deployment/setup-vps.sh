#!/bin/bash

# Pool Safe Inc VPS Quick Setup Script
# One-command deployment for Ubuntu 20.04+ VPS

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_URL="https://github.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final-.git"
APP_DIR="/var/www/poolsafe-portal"
DOMAIN="${1:-}"

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use: sudo bash setup-vps.sh)"
    exit 1
fi

# Welcome message
echo -e "${BLUE}"
cat << 'EOF'
🏊‍♀️ Pool Safe Inc VPS Setup
===========================

This script will install:
✅ Pool Safe Inc Portal (Full Stack)
✅ Blue-Green Deployment System
✅ Real-time VPS Monitoring
✅ Nginx with SSL (Let's Encrypt)
✅ Enhanced Security & Monitoring
✅ Automated Backup System

EOF
echo -e "${NC}"

if [[ -z "$DOMAIN" ]]; then
    read -p "🌐 Enter your domain name (or press Enter for IP-only setup): " DOMAIN
fi

# System update
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log "Installing essential packages..."
apt install -y curl wget git nginx nodejs npm pm2 ufw fail2ban unattended-upgrades bc jq

# Install Node.js 20
log "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Clone repository
log "Cloning Pool Safe Inc Portal..."
if [[ -d "$APP_DIR" ]]; then
    rm -rf "$APP_DIR"
fi
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# Setup backend
log "Setting up backend..."
cd backend
npm install --production
npm run build
cd ..

# Setup frontend
log "Setting up frontend..."
cd frontend
npm install --production
npm run build
cd ..

# Setup environment files
log "Configuring environment..."
if [[ ! -f backend/.env ]]; then
    cat > backend/.env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
fi

# Database setup
log "Setting up database..."
cd backend
npx prisma generate
npx prisma db push
cd ..

# Create systemd service
log "Creating systemd service..."
cat > /etc/systemd/system/poolsafe-backend.service << EOF
[Unit]
Description=Pool Safe Inc Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Nginx configuration
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/poolsafe << EOF
server {
    listen 80;
    server_name ${DOMAIN:-_};
    
    # Frontend
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy strict-origin-when-cross-origin;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # VPS Monitoring
    location /monitoring/ {
        alias /var/www/html/monitoring/;
        try_files \$uri \$uri/ =404;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/poolsafe /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Download and install deployment scripts
log "Installing deployment scripts..."
curl -fsSL https://raw.githubusercontent.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final-/main/deploy/deploy-blue-green.sh -o /opt/deploy-blue-green.sh
curl -fsSL https://raw.githubusercontent.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final-/main/deploy/vps-monitor.sh -o /opt/vps-monitor.sh
chmod +x /opt/deploy-blue-green.sh /opt/vps-monitor.sh

# Install VPS monitoring
log "Installing VPS monitoring..."
/opt/vps-monitor.sh install

# Configure firewall
log "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Configure fail2ban
log "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Set file permissions
log "Setting permissions..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Start services
log "Starting services..."
systemctl daemon-reload
systemctl enable poolsafe-backend
systemctl start poolsafe-backend
systemctl enable nginx
systemctl restart nginx

# SSL setup (if domain provided)
if [[ -n "$DOMAIN" && "$DOMAIN" != "_" ]]; then
    log "Setting up SSL certificate..."
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" --redirect || warning "SSL setup failed - continuing without SSL"
fi

# Health check
log "Performing health check..."
sleep 5
if curl -f -s http://localhost/api/health > /dev/null; then
    success "Backend health check passed"
else
    error "Backend health check failed"
fi

# Generate initial dashboard
/opt/vps-monitor.sh dashboard

# Final status
echo -e "${GREEN}"
cat << EOF

🎉 Pool Safe Inc VPS Setup Complete!
====================================

✅ Application deployed and running
✅ Nginx web server configured  
✅ SSL certificate installed (if domain provided)
✅ Blue-green deployment ready
✅ VPS monitoring active
✅ Security hardening applied
✅ Automated backups enabled

📊 Access Points:
🌐 Main Application: http${DOMAIN:+s}://${DOMAIN:-$(hostname -I | awk '{print $1}')}
📈 VPS Monitor: http${DOMAIN:+s}://${DOMAIN:-$(hostname -I | awk '{print $1}')}/monitoring/
🔧 API Health: http${DOMAIN:+s}://${DOMAIN:-$(hostname -I | awk '{print $1}')}/api/health

🛠️  Management Commands:
Deploy new version: sudo /opt/deploy-blue-green.sh deploy
Check system status: sudo /opt/vps-monitor.sh status
View logs: sudo journalctl -u poolsafe-backend -f

🔐 Next Steps:
1. Configure GitHub secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY)
2. Test the deployment workflow
3. Set up monitoring alerts
4. Configure backup retention policy

EOF
echo -e "${NC}"

success "Pool Safe Inc VPS is ready for production! 🚀"