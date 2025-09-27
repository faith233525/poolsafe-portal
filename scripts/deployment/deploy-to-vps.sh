#!/bin/bash

# Pool Safe Portal - VPS Deployment Script
# This script sets up and deploys the Pool Safe Portal on a VPS

set -e  # Exit on any error

echo "🏊‍♂️ Pool Safe Portal - VPS Deployment"
echo "=================================="

# Configuration
APP_NAME="pool-safe-portal"
APP_DIR="/var/www/pool-safe-portal"
SERVICE_USER="www-data"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system
print_step "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js
print_step "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# Install PM2 globally
print_step "Installing PM2 process manager..."
npm install -g pm2

# Install Nginx
print_step "Installing Nginx..."
apt install -y nginx

# Create application directory
print_step "Creating application directory..."
mkdir -p ${APP_DIR}
chown ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}

# Copy application files (assumes files are in current directory)
print_step "Copying application files..."
if [ -d "./backend" ]; then
    cp -r ./backend/* ${APP_DIR}/
    cp ./vps-package.json ${APP_DIR}/package.json
    
    # Set permissions
    chown -R ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}
    chmod -R 755 ${APP_DIR}
    
    print_success "Application files copied to ${APP_DIR}"
else
    print_error "Backend directory not found. Make sure you're running this from the project root."
    exit 1
fi

# Install dependencies
print_step "Installing production dependencies..."
cd ${APP_DIR}
sudo -u ${SERVICE_USER} npm install --production

# Build application
print_step "Building application..."
sudo -u ${SERVICE_USER} npm run build

# Setup database
print_step "Setting up database..."
sudo -u ${SERVICE_USER} npx prisma generate
sudo -u ${SERVICE_USER} npx prisma migrate deploy

# Create PM2 ecosystem file
print_step "Creating PM2 ecosystem file..."
cat > ${APP_DIR}/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      DATABASE_URL: 'file:./prisma/production.db'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Create logs directory
mkdir -p ${APP_DIR}/logs
chown -R ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}/logs

# Create Nginx configuration
print_step "Configuring Nginx..."
cat > /etc/nginx/sites-available/${APP_NAME} << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your actual domain
    
    # Redirect HTTP to HTTPS (uncomment when you have SSL)
    # return 301 https://$server_name$request_uri;

    # Frontend static files
    location / {
        root /var/www/pool-safe-portal-frontend;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Create systemd service for PM2
print_step "Setting up systemd service..."
sudo -u ${SERVICE_USER} pm2 start ${APP_DIR}/ecosystem.config.js
sudo -u ${SERVICE_USER} pm2 save
pm2 startup systemd -u ${SERVICE_USER} --hp ${APP_DIR}

# Start services
print_step "Starting services..."
systemctl enable nginx
systemctl restart nginx

# Create deployment health check script
cat > ${APP_DIR}/deployment-health.sh << 'EOF'
#!/bin/bash

echo "🏊‍♂️ Pool Safe Portal - Health Check"
echo "====================================="

# Check PM2 process
echo "PM2 Status:"
pm2 status

echo ""
echo "Application Health:"
curl -f http://localhost:4000/health && echo " ✅ Backend healthy" || echo " ❌ Backend unhealthy"

echo ""
echo "Nginx Status:"
systemctl is-active nginx && echo " ✅ Nginx running" || echo " ❌ Nginx not running"

echo ""
echo "Logs (last 10 lines):"
tail -10 /var/www/pool-safe-portal/logs/combined.log
EOF

chmod +x ${APP_DIR}/deployment-health.sh

print_success "Deployment completed successfully!"
echo ""
echo "🎉 Pool Safe Portal is now deployed!"
echo ""
echo "Next steps:"
echo "1. Update server_name in /etc/nginx/sites-available/${APP_NAME} with your domain"
echo "2. Set up SSL certificate (recommended: certbot for Let's Encrypt)"
echo "3. Configure your .env file in ${APP_DIR}"
echo "4. Run health check: ${APP_DIR}/deployment-health.sh"
echo ""
echo "Useful commands:"
echo "  pm2 status                    # Check application status"
echo "  pm2 logs ${APP_NAME}         # View application logs"
echo "  pm2 restart ${APP_NAME}      # Restart application"
echo "  systemctl status nginx       # Check Nginx status"
echo "  nginx -t                     # Test Nginx configuration"
echo ""
echo "Your application should be accessible at: http://your-server-ip"