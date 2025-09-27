#!/bin/bash
# VPS Deployment Script for Pool Safe Inc Portal
# This script automates the complete deployment to VPS

set -e # Exit on any error

# Configuration
APP_NAME="pool-safe-portal"
BACKEND_PORT=4000
FRONTEND_PORT=3000
DB_NAME="poolsafe_production"
BACKUP_DIR="/var/backups/poolsafe"
LOG_DIR="/var/log/poolsafe"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required commands exist
    local commands=("node" "npm" "git" "nginx" "systemctl" "psql")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            error "Required command '$cmd' is not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    if ! (echo "$required_version"; echo "$node_version") | sort -V | head -n1 | grep -q "^$required_version"; then
        error "Node.js version $required_version or higher required. Current: $node_version"
        exit 1
    fi
    
    # Check available disk space (require at least 2GB)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=2097152 # 2GB in KB
    if [[ $available_space -lt $required_space ]]; then
        error "Insufficient disk space. Required: 2GB, Available: $(($available_space / 1024))MB"
        exit 1
    fi
    
    # Check if ports are available
    if ss -tuln | grep -q ":$BACKEND_PORT "; then
        error "Port $BACKEND_PORT is already in use"
        exit 1
    fi
    
    if ss -tuln | grep -q ":$FRONTEND_PORT "; then
        error "Port $FRONTEND_PORT is already in use"
        exit 1
    fi
    
    success "All pre-deployment checks passed"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    sudo mkdir -p $BACKUP_DIR $LOG_DIR
    sudo chown $USER:$USER $BACKUP_DIR $LOG_DIR
    
    # Create application directory
    mkdir -p ~/apps/$APP_NAME
    
    success "Directories created successfully"
}

# Setup PostgreSQL database
setup_database() {
    log "Setting up PostgreSQL database..."
    
    # Check if PostgreSQL is installed
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL is not installed. Please install it first."
        exit 1
    fi
    
    # Create database if it doesn't exist
    if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        log "Creating database $DB_NAME..."
        sudo -u postgres createdb $DB_NAME
        sudo -u postgres psql -c "CREATE USER poolsafe_user WITH PASSWORD 'secure_password_change_me';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO poolsafe_user;"
        success "Database created successfully"
    else
        log "Database $DB_NAME already exists"
    fi
}

# Deploy application code
deploy_application() {
    log "Deploying application code..."
    
    local app_dir=~/apps/$APP_NAME
    cd $app_dir
    
    # Clone or update repository
    if [[ ! -d ".git" ]]; then
        log "Cloning repository..."
        git clone https://github.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final-.git .
    else
        log "Updating repository..."
        git fetch origin
        git reset --hard origin/main
    fi
    
    # Install backend dependencies
    log "Installing backend dependencies..."
    cd backend
    npm ci --production=false
    
    # Build backend
    log "Building backend..."
    npm run build
    
    # Install frontend dependencies
    log "Installing frontend dependencies..."
    cd ../frontend
    npm ci --production=false
    
    # Build frontend
    log "Building frontend..."
    npm run build
    
    cd ..
    success "Application deployed successfully"
}

# Configure environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    local app_dir=~/apps/$APP_NAME
    
    # Create backend .env file
    cat > $app_dir/backend/.env << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
DATABASE_URL="postgresql://poolsafe_user:secure_password_change_me@localhost:5432/$DB_NAME"

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:$FRONTEND_PORT,https://yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=$(openssl rand -base64 32)
COOKIE_SECRET=$(openssl rand -base64 32)

# Email Configuration (update with your SMTP settings)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@poolsafe.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=$LOG_DIR/app.log

# Health Check
HEALTH_CHECK_PATH=/api/health
EOF

    # Create frontend environment file
    cat > $app_dir/frontend/.env << EOF
VITE_API_BASE_URL=http://localhost:$BACKEND_PORT
VITE_APP_NAME="Pool Safe Inc Portal"
VITE_VERSION=1.0.0
NODE_ENV=production
EOF

    success "Environment variables configured"
}

# Setup systemd services
setup_services() {
    log "Setting up systemd services..."
    
    local app_dir=~/apps/$APP_NAME
    
    # Backend service
    sudo tee /etc/systemd/system/poolsafe-backend.service > /dev/null << EOF
[Unit]
Description=Pool Safe Inc Backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$app_dir/backend
Environment=NODE_ENV=production
EnvironmentFile=$app_dir/backend/.env
ExecStart=/usr/bin/node dist/index.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$app_dir $LOG_DIR /tmp
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service (static file server)
    sudo tee /etc/systemd/system/poolsafe-frontend.service > /dev/null << EOF
[Unit]
Description=Pool Safe Inc Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$app_dir/frontend
ExecStart=/usr/bin/npx serve -s dist -l $FRONTEND_PORT
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$app_dir
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable services
    sudo systemctl daemon-reload
    sudo systemctl enable poolsafe-backend poolsafe-frontend
    
    success "Systemd services configured"
}

# Configure Nginx
setup_nginx() {
    log "Configuring Nginx..."
    
    sudo tee /etc/nginx/sites-available/poolsafe > /dev/null << EOF
server {
    listen 80;
    server_name localhost;  # Replace with your domain
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://localhost:$FRONTEND_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/poolsafe /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    if sudo nginx -t; then
        success "Nginx configuration is valid"
    else
        error "Nginx configuration test failed"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    local app_dir=~/apps/$APP_NAME
    cd $app_dir/backend
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma db push
    
    # Seed database if needed
    if [[ -f "scripts/seed.ts" ]]; then
        log "Seeding database..."
        npm run seed
    fi
    
    success "Database migrations completed"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start backend
    sudo systemctl start poolsafe-backend
    sleep 2
    
    # Start frontend
    sudo systemctl start poolsafe-frontend
    sleep 2
    
    # Restart nginx
    sudo systemctl restart nginx
    
    success "All services started"
}

# Health checks
run_health_checks() {
    log "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check backend health
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:$BACKEND_PORT/api/health | grep -q '"ok":true'; then
            success "Backend health check passed"
            break
        else
            warning "Backend health check attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
            sleep 2
            ((attempt++))
        fi
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Backend health check failed after $max_attempts attempts"
        return 1
    fi
    
    # Check frontend
    attempt=1
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:$FRONTEND_PORT | grep -q "html"; then
            success "Frontend health check passed"
            break
        else
            warning "Frontend health check attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
            sleep 2
            ((attempt++))
        fi
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Frontend health check failed after $max_attempts attempts"
        return 1
    fi
    
    # Check nginx
    if curl -s http://localhost | grep -q "html"; then
        success "Nginx proxy health check passed"
    else
        error "Nginx proxy health check failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Backup function
create_backup() {
    log "Creating backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/poolsafe_backup_$timestamp.sql"
    
    # Database backup
    pg_dump $DB_NAME > $backup_file
    gzip $backup_file
    
    # Keep only last 5 backups
    ls -t $BACKUP_DIR/poolsafe_backup_*.sql.gz | tail -n +6 | xargs -r rm
    
    success "Backup created: ${backup_file}.gz"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo
    
    # Service status
    echo "Services:"
    sudo systemctl is-active poolsafe-backend && echo "  ✓ Backend: Running" || echo "  ✗ Backend: Not running"
    sudo systemctl is-active poolsafe-frontend && echo "  ✓ Frontend: Running" || echo "  ✗ Frontend: Not running"
    sudo systemctl is-active nginx && echo "  ✓ Nginx: Running" || echo "  ✗ Nginx: Not running"
    
    echo
    echo "URLs:"
    echo "  Frontend: http://localhost"
    echo "  Backend API: http://localhost/api"
    echo "  Health Check: http://localhost/api/health"
    
    echo
    echo "Logs:"
    echo "  Backend: journalctl -u poolsafe-backend -f"
    echo "  Frontend: journalctl -u poolsafe-frontend -f"
    echo "  Nginx: tail -f /var/log/nginx/access.log"
    echo "  Application: tail -f $LOG_DIR/app.log"
}

# Main deployment function
main() {
    log "Starting VPS deployment for Pool Safe Inc Portal..."
    
    check_root
    pre_deployment_checks
    setup_directories
    setup_database
    deploy_application
    setup_environment
    run_migrations
    setup_services
    setup_nginx
    start_services
    
    log "Running health checks..."
    if run_health_checks; then
        create_backup
        success "Deployment completed successfully!"
        show_status
    else
        error "Deployment failed health checks"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "backup")
        create_backup
        ;;
    "status")
        show_status
        ;;
    "health")
        run_health_checks
        ;;
    "restart")
        sudo systemctl restart poolsafe-backend poolsafe-frontend nginx
        log "Services restarted"
        ;;
    *)
        main
        ;;
esac