#!/bin/bash

# Pool Safe Inc Portal - Production Deployment Helper Script
# This script helps deploy the Pool Safe Inc Portal to a VPS server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final-.git"
DEPLOY_DIR="/var/www/poolsafe-portal"
SERVICE_NAME="poolsafe-backend"
BACKUP_DIR="/var/backups/poolsafe"
FRONTEND_DIR="/var/www/portal.loungenie.com"
DOMAIN_API="api.loungenie.com"
DOMAIN_FRONTEND="portal.loungenie.com"
SERVER_IP="66.102.133.37"

echo -e "${BLUE}🚀 Pool Safe Inc Portal - Production Deployment${NC}"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ This script should not be run as root for security reasons${NC}"
    echo "   Run as a regular user with sudo privileges"
    exit 1
fi

# Check if we're on Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    echo -e "${RED}❌ This script is designed for Ubuntu/Debian systems${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running on $(lsb_release -d | cut -f2)${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install packages
install_package() {
    if ! dpkg -l | grep -q "^ii  $1 "; then
        echo -e "${YELLOW}📦 Installing $1...${NC}"
        sudo apt update -qq
        sudo apt install -y "$1"
    else
        echo -e "${GREEN}✅ $1 is already installed${NC}"
    fi
}

# Check system requirements
echo -e "${BLUE}🔍 Checking system requirements...${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${YELLOW}📦 Installing Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "${RED}❌ Node.js 20+ required. Current: $(node --version)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
fi

# Check npm
if ! command_exists npm; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Install required packages
install_package "git"
install_package "nginx"
install_package "ufw"
install_package "certbot"
install_package "python3-certbot-nginx"

# Check PM2
if ! command_exists pm2; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}✅ PM2 is installed${NC}"
fi

# Create deployment directory
echo -e "${BLUE}📁 Setting up deployment directory...${NC}"
if [ ! -d "$DEPLOY_DIR" ]; then
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown "$USER:$USER" "$DEPLOY_DIR"
    echo -e "${GREEN}✅ Created deployment directory${NC}"
else
    echo -e "${GREEN}✅ Deployment directory exists${NC}"
fi

# Clone or update repository
echo -e "${BLUE}📥 Deploying application code...${NC}"
if [ ! -d "$DEPLOY_DIR/.git" ]; then
    echo -e "${YELLOW}📦 Cloning repository...${NC}"
    git clone "$REPO_URL" "$DEPLOY_DIR"
else
    echo -e "${YELLOW}🔄 Updating repository...${NC}"
    cd "$DEPLOY_DIR"
    git fetch origin
    git reset --hard origin/main
fi

cd "$DEPLOY_DIR"

# Create backup
echo -e "${BLUE}💾 Creating backup...${NC}"
sudo mkdir -p "$BACKUP_DIR"
if [ -f "$DEPLOY_DIR/backend/prisma/production.db" ]; then
    sudo cp "$DEPLOY_DIR/backend/prisma/production.db" "$BACKUP_DIR/production-$(date +%Y%m%d-%H%M%S).db"
    echo -e "${GREEN}✅ Database backup created${NC}"
fi

# Install dependencies and build
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Backend
cd backend
# Install with devDependencies so Prisma CLI is available for generate/migrate
npm ci
# Ensure PRISMA_SCHEMA and DATABASE_URL are available for prisma commands
set -a
source .env 2>/dev/null || true
set +a
# Default PRISMA_SCHEMA to Postgres schema if not set in environment
export PRISMA_SCHEMA=${PRISMA_SCHEMA:-"$DEPLOY_DIR/backend/prisma/schema.postgres.prisma"}

# Generate Prisma Client for Postgres and build the app
npx prisma generate
npm run build
cd ..

# Frontend
cd frontend
# Install with devDependencies for Vite build
npm ci
npm run build
cd ..

echo -e "${GREEN}✅ Dependencies installed and built${NC}"

# Setup environment (backend)
echo -e "${BLUE}⚙️  Setting up environment...${NC}"
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  Created backend/.env from example. Please edit with your production values (DATABASE_URL for Postgres, JWT_SECRET, etc.)${NC}"
    echo "   nano backend/.env"
else
    echo -e "${GREEN}✅ backend/.env exists${NC}"
fi

# Setup database (Postgres migrate deploy + seed)
echo -e "${BLUE}💾 Applying database migrations and seeding...${NC}"
cd backend
# Re-load env to ensure DATABASE_URL is available for migration/seed
set -a
source .env 2>/dev/null || true
set +a
export PRISMA_SCHEMA=${PRISMA_SCHEMA:-"$DEPLOY_DIR/backend/prisma/schema.postgres.prisma"}

# Apply migrations to Postgres
# Validate DATABASE_URL looks like Postgres URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in backend/.env. Please set a Postgres connection string and rerun.${NC}"
    exit 1
fi
case "$DATABASE_URL" in
    postgresql://*) ;;
    postgres://*) ;;
    *)
        echo -e "${RED}❌ DATABASE_URL does not look like a Postgres URL. Current: $DATABASE_URL${NC}"
        echo "   Expected format: postgresql://user:pass@host:5432/dbname?schema=public"
        exit 1
        ;;
esac
if ! npx prisma migrate deploy; then
    echo -e "${YELLOW}⚠️  prisma migrate deploy failed (likely first-time Postgres without migrations). Falling back to 'prisma db push' to create baseline schema...${NC}"
    npx prisma db push --skip-generate
    # Ensure client matches the current schema
    npx prisma generate
fi

# Seed via compiled script against DATABASE_URL (DB-agnostic seed)
if [ -n "$DATABASE_URL" ]; then
    echo -e "${BLUE}🌱 Seeding database via compiled script...${NC}"
    npm run seed:compiled -- --dbUrl="$DATABASE_URL"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not set in backend/.env. Skipping seed. Set Postgres URL then rerun seeding.${NC}"
fi
cd ..

# Configure Nginx
echo -e "${BLUE}🌐 Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/poolsafe > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Enable gzip compression for text assets
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Frontend
    location / {
        root /var/www/poolsafe-portal/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health checks (proxy to backend API)
    location /health {
        proxy_pass http://localhost:4000/api/health;
    }
    location /healthz {
        proxy_pass http://localhost:4000/api/healthz;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/poolsafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

# Setup PM2
echo -e "${BLUE}🔄 Setting up PM2...${NC}"
cd backend
pm2 delete "$SERVICE_NAME" 2>/dev/null || true
# Ensure runtime has DATABASE_URL (and optionally PRISMA_SCHEMA/ENABLE_PM2_CLUSTER) from backend/.env
set -a
source .env 2>/dev/null || true
set +a
if [ "$ENABLE_PM2_CLUSTER" = "true" ]; then
    echo -e "${BLUE}⚙️  Starting PM2 in cluster mode (max instances)...${NC}"
    pm2 start dist/index.js -i max --name "$SERVICE_NAME"
else
    pm2 start npm --name "$SERVICE_NAME" -- start
fi
pm2 save
pm2 startup

echo -e "${GREEN}✅ PM2 configured${NC}"

# Configure firewall
echo -e "${BLUE}🔒 Configuring firewall...${NC}"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo -e "${GREEN}✅ Firewall configured${NC}"

# Final checks
echo -e "${BLUE}🔍 Running health checks...${NC}"

# Check if backend is running
sleep 5
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
fi

# Check if Nginx is serving frontend
if curl -f http://localhost >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is being served${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Update your domain DNS to point to this server's IP"
echo "2. Edit /etc/nginx/sites-available/poolsafe and replace 'your-domain.com'"
echo "3. Configure SSL certificate:"
echo "   sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
echo "4. Edit .env.production with your actual credentials"
echo "5. Restart the backend: pm2 restart $SERVICE_NAME"
echo ""
echo -e "${BLUE}📚 Management commands:${NC}"
echo "• View backend logs: pm2 logs $SERVICE_NAME"
echo "• Restart backend: pm2 restart $SERVICE_NAME"
echo "• Check status: pm2 status"
echo "• Reload Nginx: sudo systemctl reload nginx"
echo "• Run health check: ./deploy/health-check.sh"
echo ""
echo -e "${GREEN}✨ Your Pool Safe Inc Portal is ready!${NC}"