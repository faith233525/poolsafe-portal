#!/bin/bash

# Pool Safe Inc Portal - VPS Setup Script
# Run this script on your VPS to set up the hosting environment

set -e

echo "🚀 Setting up Pool Safe Inc Portal on VPS..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git (if not already installed)
sudo apt install -y git

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/poolsafe-portal
sudo chown -R $USER:$USER /var/www/poolsafe-portal

# Clone repository (you'll need to run this with your repo URL)
echo "📥 Clone your repository manually:"
echo "cd /var/www/poolsafe-portal"
echo "git clone https://github.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final- ."

###############################################
# Optional: Install PostgreSQL (recommended)
###############################################
read -p "📦 Install PostgreSQL locally? (y/N): " INSTALL_PG
if [[ "$INSTALL_PG" =~ ^[Yy]$ ]]; then
    echo "📦 Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    echo "🛠️  Creating database and user (you'll be prompted for postgres password if configured)..."
    read -p "Enter Postgres DB name [poolsafe]: " PG_DB
    PG_DB=${PG_DB:-poolsafe}
    read -p "Enter Postgres username [poolsafe_user]: " PG_USER
    PG_USER=${PG_USER:-poolsafe_user}
    read -s -p "Enter Postgres password for $PG_USER: " PG_PASS
    echo
    sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE DATABASE "$PG_DB";
DO

	$$
	BEGIN
	   IF NOT EXISTS (
	     SELECT FROM pg_catalog.pg_roles WHERE rolname = '$PG_USER'
	   ) THEN
	     CREATE ROLE "$PG_USER" LOGIN PASSWORD '$PG_PASS';
	   END IF;
	END
	$$;
GRANT ALL PRIVILEGES ON DATABASE "$PG_DB" TO "$PG_USER";
SQL
    echo "✅ PostgreSQL ready."
    PG_URL="postgresql://$PG_USER:$PG_PASS@localhost:5432/$PG_DB"
else
    PG_URL="postgresql://user:password@localhost:5432/poolsafe"
fi

# Create environment file template
echo "📝 Creating environment template..."
mkdir -p /var/www/poolsafe-portal/backend
cat > /var/www/poolsafe-portal/backend/.env.production << EOL
# Database (PostgreSQL recommended)
DATABASE_URL="$PG_URL"

# JWT
JWT_SECRET="change-this-to-a-long-random-string"

# SMTP Email Configuration (Outbound)
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_USER="support@poolsafeinc.com"
SMTP_PASS="YOUR_EMAIL_PASSWORD"
SMTP_FROM="support@poolsafeinc.com"

# Inbound Email (Email-to-Ticket)
SUPPORT_EMAIL_HOST="outlook.office365.com"
SUPPORT_EMAIL_PORT=993
SUPPORT_EMAIL_USER="support@poolsafeinc.com"
SUPPORT_EMAIL_PASS="YOUR_EMAIL_PASSWORD"

# Admin / Internal
ADMIN_EMAILS="support@poolsafeinc.com,fabdi@poolsafeinc.com"
INTERNAL_EMAIL_DOMAIN="poolsafeinc.com"

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL="https://your-domain.com"
EOL

###############################################
# PM2 process manager configuration (API+Worker)
###############################################
echo "⚙️ Configuring PM2 startup..."
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 10M || true
pm2 set pm2-logrotate:retain 30 || true
pm2 set pm2-logrotate:compress true || true
pm2 startup systemd -u $USER --hp $HOME || true

# Create Nginx configuration
echo "🌐 Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/poolsafe-portal << EOL
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend (React build)
    location / {
        root /var/www/poolsafe-portal/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOL

# Enable the site
sudo ln -sf /etc/nginx/sites-available/poolsafe-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Install Certbot for SSL
echo "🔒 Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

echo "🚀 Enabling nginx..."
sudo systemctl enable nginx

echo "✅ VPS setup completed!"
echo ""
echo "📝 Next steps:"
echo "1) Clone your repository to /var/www/poolsafe-portal"
echo "2) Update /var/www/poolsafe-portal/backend/.env.production with your settings"
echo "3) Update Nginx server_name with your domain"
echo "4) Run: sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
echo "5) Build and start with PM2 (see commands below)"
echo ""
echo "🔧 Deploy commands:"
echo "cd /var/www/poolsafe-portal"
echo "# Backend build"
echo "cd backend && npm ci --production && npm run build && npx prisma migrate deploy"
echo "# Frontend build"
echo "cd ../frontend && npm ci --production && npm run build"
echo "# Start API and Email Worker with PM2"
echo "pm2 start ../deploy/ecosystem.config.js && pm2 save"
echo "# Reload nginx"
echo "sudo systemctl reload nginx"