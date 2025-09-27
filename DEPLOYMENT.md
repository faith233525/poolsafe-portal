# Pool Safe Inc Portal - Deployment Documentation

## Quick Start Deployment

### Prerequisites

- Ubuntu 20.04+ or Debian 11+ server
- Root or sudo access
- Domain name pointed to server IP
- Minimum 2GB RAM, 20GB storage

### One-Command Deployment

```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/your-repo/deploy/main/deploy-production.sh | bash
```

## Manual Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required packages
sudo apt install -y git nginx ufw certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Application Deployment

```bash
# Clone repository
sudo mkdir -p /var/www/poolsafe-portal
sudo chown $USER:$USER /var/www/poolsafe-portal
git clone https://github.com/your-repo/poolsafe-portal.git /var/www/poolsafe-portal

# Navigate to project
cd /var/www/poolsafe-portal

# Install and build backend
cd backend
npm ci --production
npm run build
cd ..

# Install and build frontend
cd frontend
npm ci --production
npm run build
cd ..
```

### 3. Environment Configuration

```bash
# Copy production environment template
cp .env.production.template .env.production

# Edit with your settings
nano .env.production
```

**Required Environment Variables:**

```env
NODE_ENV=production
JWT_SECRET=your-64-character-secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CORS_ORIGIN=https://your-domain.com
```

### 4. Database Setup

```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..
```

### 5. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/poolsafe
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

**Enable Site:**

```bash
sudo ln -s /etc/nginx/sites-available/poolsafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Process Management with PM2

```bash
cd /var/www/poolsafe-portal/backend
pm2 start npm --name "poolsafe-backend" -- start
pm2 save
pm2 startup
```

### 7. SSL Certificate Setup

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 8. Firewall Configuration

```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## Post-Deployment

### Health Check

```bash
# Run comprehensive health check
./deploy/health-check.sh

# Quick status check
pm2 status
sudo systemctl status nginx
```

### Monitoring

- **Application logs:** `pm2 logs poolsafe-backend`
- **Nginx logs:** `sudo journalctl -u nginx -f`
- **System resources:** `htop` or `./deploy/health-check.sh`

### Backup Setup

```bash
# Create backup script
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * /var/www/poolsafe-portal/deploy/backup.sh
```

## Maintenance

### Updates

```bash
cd /var/www/poolsafe-portal
git pull origin main
cd backend && npm ci --production && npm run build
cd ../frontend && npm ci --production && npm run build
pm2 restart poolsafe-backend
```

### SSL Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Automatic renewal is set up via cron
```

### Database Backup

```bash
# Manual backup
cp backend/prisma/production.db backups/production-$(date +%Y%m%d).db

# Automated backups are in /var/backups/poolsafe/
```

## Troubleshooting

### Common Issues

**Backend not starting:**

```bash
pm2 logs poolsafe-backend
# Check for port conflicts or environment issues
```

**Nginx 502 errors:**

```bash
sudo nginx -t
sudo systemctl status nginx
# Ensure backend is running on port 3000
```

**Database connection errors:**

```bash
cd backend
npx prisma db push
# Check file permissions on database file
```

**SSL certificate issues:**

```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```

### Performance Optimization

**Enable Gzip compression:**

```nginx
# Add to nginx configuration
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

**Database optimization:**

```bash
# Regular VACUUM for SQLite
cd backend
echo "VACUUM;" | npx prisma db execute --stdin
```

**Log rotation:**

```bash
sudo nano /etc/logrotate.d/poolsafe
```

## Security Checklist

- [ ] Strong JWT secrets generated
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured (only SSH, HTTP, HTTPS)
- [ ] Regular security updates scheduled
- [ ] Database backups automated
- [ ] Environment variables secured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] File upload restrictions in place
- [ ] Log monitoring set up

## Support

For deployment issues:

1. Check logs: `pm2 logs poolsafe-backend`
2. Run health check: `./deploy/health-check.sh`
3. Review Nginx config: `sudo nginx -t`
4. Check firewall: `sudo ufw status`

For application issues, see the main README.md file.
