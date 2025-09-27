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

# Create environment file template
echo "📝 Creating environment template..."
cat > /var/www/poolsafe-portal/backend/.env.production << EOL
# Database
DATABASE_URL="file:./production.db"

# JWT
JWT_SECRET="your-super-secure-jwt-secret-change-this"

# SMTP Email Configuration
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-email-password"
SMTP_FROM="noreply@poolsafe.com"

# Azure AD SSO (Optional)
AZURE_CLIENT_ID="your-azure-client-id"
AZURE_CLIENT_SECRET="your-azure-client-secret"
AZURE_TENANT_ID="your-azure-tenant-id"

# HubSpot Integration (Optional)
HUBSPOT_ACCESS_TOKEN="your-hubspot-token"

# Application
NODE_ENV=production
PORT=3000
EOL

# Create systemd service for backend
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/poolsafe-backend.service > /dev/null << EOL
[Unit]
Description=Pool Safe Inc Portal Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/poolsafe-portal/backend
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

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

# Enable and start services
echo "🚀 Starting services..."
sudo systemctl enable poolsafe-backend
sudo systemctl enable nginx

echo "✅ VPS setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Clone your repository to /var/www/poolsafe-portal"
echo "2. Update /var/www/poolsafe-portal/backend/.env.production with your settings"
echo "3. Update Nginx server_name with your domain"
echo "4. Run: sudo certbot --nginx -d your-domain.com"
echo "5. Deploy your application"
echo ""
echo "🔧 Deploy commands:"
echo "cd /var/www/poolsafe-portal"
echo "cd backend && npm ci --production && npm run build"
echo "cd ../frontend && npm ci --production && npm run build"
echo "sudo systemctl start poolsafe-backend"
echo "sudo systemctl reload nginx"