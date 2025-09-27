#!/bin/bash

# Enhanced VPS Deployment Script with Blue-Green Deployment
# This script provides zero-downtime deployment with rollback capabilities

set -euo pipefail

# Configuration
APP_NAME="poolsafe-portal"
DEPLOY_DIR="/var/www"
BACKUP_DIR="/var/backups/deployments"
BLUE_DIR="${DEPLOY_DIR}/${APP_NAME}-blue"
GREEN_DIR="${DEPLOY_DIR}/${APP_NAME}-green"
CURRENT_LINK="${DEPLOY_DIR}/${APP_NAME}"
NGINX_CONFIG="/etc/nginx/sites-available/${APP_NAME}"
SERVICE_NAME="poolsafe-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Determine current and new deployment directories
setup_directories() {
    # Create directories if they don't exist
    mkdir -p "$BLUE_DIR" "$GREEN_DIR" "$BACKUP_DIR"
    
    # Determine which environment is currently active
    if [[ -L "$CURRENT_LINK" ]]; then
        CURRENT_TARGET=$(readlink "$CURRENT_LINK")
        if [[ "$CURRENT_TARGET" == "$BLUE_DIR" ]]; then
            CURRENT_ENV="blue"
            NEW_ENV="green"
            NEW_DIR="$GREEN_DIR"
            OLD_DIR="$BLUE_DIR"
        else
            CURRENT_ENV="green"
            NEW_ENV="blue"
            NEW_DIR="$BLUE_DIR"
            OLD_DIR="$GREEN_DIR"
        fi
    else
        # First deployment
        CURRENT_ENV="none"
        NEW_ENV="blue"
        NEW_DIR="$BLUE_DIR"
        OLD_DIR=""
    fi
    
    log "Current environment: $CURRENT_ENV"
    log "Deploying to: $NEW_ENV ($NEW_DIR)"
}

# Create deployment backup
create_backup() {
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${BACKUP_DIR}/backup_${backup_timestamp}.tar.gz"
    
    if [[ -L "$CURRENT_LINK" ]] && [[ -d "$(readlink "$CURRENT_LINK")" ]]; then
        log "Creating backup of current deployment..."
        tar -czf "$backup_path" -C "$(dirname "$CURRENT_LINK")" "$(basename "$(readlink "$CURRENT_LINK")")"
        success "Backup created: $backup_path"
        
        # Keep only last 5 backups
        ls -t ${BACKUP_DIR}/backup_*.tar.gz | tail -n +6 | xargs -r rm
    fi
}

# Clone and setup new deployment
deploy_new_version() {
    log "Deploying new version to $NEW_DIR..."
    
    # Remove existing directory
    rm -rf "$NEW_DIR"
    
    # Clone repository
    log "Cloning repository..."
    git clone https://github.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final-.git "$NEW_DIR"
    cd "$NEW_DIR"
    
    # Install and build backend
    log "Building backend..."
    cd backend
    npm ci --production
    npm run build
    
    # Install and build frontend  
    log "Building frontend..."
    cd ../frontend
    npm ci --production
    npm run build
    
    # Copy environment files
    if [[ -f "${OLD_DIR}/.env" ]]; then
        cp "${OLD_DIR}/.env" "${NEW_DIR}/.env"
    fi
    
    if [[ -f "${OLD_DIR}/backend/.env" ]]; then
        cp "${OLD_DIR}/backend/.env" "${NEW_DIR}/backend/.env"
    fi
    
    success "New version deployed to $NEW_DIR"
}

# Health check function
health_check() {
    local url="$1"
    local max_attempts=30
    local attempt=1
    
    log "Performing health check on $url..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s -o /dev/null "$url"; then
            success "Health check passed (attempt $attempt)"
            return 0
        fi
        
        log "Health check failed (attempt $attempt/$max_attempts), retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Update Nginx configuration for new deployment
update_nginx() {
    log "Updating Nginx configuration..."
    
    # Backup current config
    cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%s)"
    
    # Update root path in nginx config
    sed -i "s|root .*/poolsafe-portal[^/]*/frontend/dist|root ${NEW_DIR}/frontend/dist|g" "$NGINX_CONFIG"
    
    # Test nginx configuration
    if nginx -t; then
        systemctl reload nginx
        success "Nginx configuration updated and reloaded"
    else
        error "Nginx configuration test failed"
        # Restore backup
        cp "${NGINX_CONFIG}.backup.$(date +%s)" "$NGINX_CONFIG"
        return 1
    fi
}

# Update systemd service for new deployment
update_service() {
    log "Updating systemd service..."
    
    # Update service file
    local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
    
    if [[ -f "$service_file" ]]; then
        # Backup current service file
        cp "$service_file" "${service_file}.backup.$(date +%s)"
        
        # Update ExecStart path
        sed -i "s|ExecStart=.*node|ExecStart=${NEW_DIR}/backend/dist/index.js|g" "$service_file"
        sed -i "s|WorkingDirectory=.*|WorkingDirectory=${NEW_DIR}/backend|g" "$service_file"
        
        # Reload systemd and restart service
        systemctl daemon-reload
        systemctl restart "$SERVICE_NAME"
        
        # Check service status
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            success "Service $SERVICE_NAME restarted successfully"
        else
            error "Service $SERVICE_NAME failed to start"
            return 1
        fi
    else
        warning "Service file $service_file not found, skipping service update"
    fi
}

# Switch symlink to new deployment
switch_deployment() {
    log "Switching deployment symlink..."
    
    # Remove old symlink
    rm -f "$CURRENT_LINK"
    
    # Create new symlink
    ln -sf "$NEW_DIR" "$CURRENT_LINK"
    
    success "Deployment switched to $NEW_ENV environment"
}

# Rollback to previous deployment
rollback_deployment() {
    error "Deployment failed, initiating rollback..."
    
    if [[ -n "$OLD_DIR" ]] && [[ -d "$OLD_DIR" ]]; then
        log "Rolling back to previous deployment..."
        
        # Restore symlink
        rm -f "$CURRENT_LINK"
        ln -sf "$OLD_DIR" "$CURRENT_LINK"
        
        # Restore nginx config
        if [[ -f "${NGINX_CONFIG}.backup.$(date +%s)" ]]; then
            cp "${NGINX_CONFIG}.backup.$(date +%s)" "$NGINX_CONFIG"
            systemctl reload nginx
        fi
        
        # Restore service
        local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
        if [[ -f "${service_file}.backup.$(date +%s)" ]]; then
            cp "${service_file}.backup.$(date +%s)" "$service_file"
            systemctl daemon-reload
            systemctl restart "$SERVICE_NAME"
        fi
        
        success "Rollback completed"
    else
        error "No previous deployment found for rollback"
    fi
}

# Cleanup old deployments
cleanup() {
    log "Cleaning up..."
    
    # Remove backup config files older than 7 days
    find /etc/nginx/sites-available/ -name "${APP_NAME}.backup.*" -mtime +7 -delete 2>/dev/null || true
    find /etc/systemd/system/ -name "${SERVICE_NAME}.service.backup.*" -mtime +7 -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main deployment function
main_deploy() {
    log "Starting blue-green deployment for $APP_NAME..."
    
    check_root
    setup_directories
    create_backup
    
    # Deploy new version
    if ! deploy_new_version; then
        error "Failed to deploy new version"
        exit 1
    fi
    
    # Update configurations
    if ! update_nginx; then
        rollback_deployment
        exit 1
    fi
    
    if ! update_service; then
        rollback_deployment  
        exit 1
    fi
    
    # Switch to new deployment
    switch_deployment
    
    # Health check
    sleep 5  # Give services time to start
    if ! health_check "http://localhost/api/health"; then
        rollback_deployment
        exit 1
    fi
    
    cleanup
    
    success "🚀 Blue-green deployment completed successfully!"
    success "Active environment: $NEW_ENV"
    log "Application is running at: http://$(hostname -I | awk '{print $1}')"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main_deploy
        ;;
    "rollback")
        check_root
        setup_directories
        rollback_deployment
        ;;
    "status")
        setup_directories
        echo "Current environment: $CURRENT_ENV"
        if [[ -L "$CURRENT_LINK" ]]; then
            echo "Current deployment: $(readlink "$CURRENT_LINK")"
        fi
        systemctl status "$SERVICE_NAME" --no-pager
        ;;
    "health")
        health_check "http://localhost/api/health"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|health}"
        echo "  deploy   - Deploy new version with blue-green strategy"
        echo "  rollback - Rollback to previous deployment"
        echo "  status   - Show current deployment status"
        echo "  health   - Perform health check"
        exit 1
        ;;
esac