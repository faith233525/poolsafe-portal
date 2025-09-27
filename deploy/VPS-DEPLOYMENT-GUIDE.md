# Pool Safe Inc Portal - VPS Deployment Guide

## 🚀 VPS Hosting Setup

This guide will help you deploy your Pool Safe Inc Portal to a VPS server.

### Prerequisites

- VPS with Ubuntu 20.04+ (2GB RAM minimum, 4GB recommended)
- Domain name pointed to your VPS IP
- SSH access to your VPS

### Recommended VPS Providers

- **DigitalOcean**: $5-20/month droplets
- **Linode**: $5-10/month
- **Vultr**: $2.50-10/month
- **AWS EC2**: t3.micro ~$8-15/month

## 📋 Step-by-Step Deployment

### 1. Initial VPS Setup

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Run the setup script
wget https://raw.githubusercontent.com/your-repo/main/deploy/vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh
```

### 2. Clone Your Repository

```bash
cd /var/www/poolsafe-portal
git clone https://github.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final- .
```

### 3. Configure Environment Variables

```bash
# Edit backend environment file
nano /var/www/poolsafe-portal/backend/.env
```

**Required Environment Variables:**

```env
# Database (Postgres recommended in production)
DATABASE_URL="postgresql://user:password@localhost:5432/loungenie?schema=public"
# Optional: help Prisma CLI find the Postgres schema file
PRISMA_SCHEMA=backend/prisma/schema.postgres.prisma

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secure-jwt-secret-64-characters-long"

# SMTP Email Configuration (if email is used)
SMTP_HOST="smtp.provider.com"
SMTP_PORT=587
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@poolsafe.com"

# Azure AD SSO (if using SSO)
# AZURE_CLIENT_ID="your-azure-client-id"
# AZURE_CLIENT_SECRET="your-azure-client-secret"
# AZURE_TENANT_ID="your-azure-tenant-id"

# Production settings
NODE_ENV=production
PORT=4000
ENABLE_PM2_CLUSTER=true
```

### 4. Configure Nginx Domain

```bash
# Update Nginx configuration with your domain
sudo nano /etc/nginx/sites-available/poolsafe-portal

# Replace 'your-domain.com' with your actual domain
# Example: poolsafe.com www.poolsafe.com
```

### 5. Deploy Application

```bash
cd /var/www/poolsafe-portal

# Use automated production deploy script (installs deps, builds, migrates, seeds, configures Nginx + PM2)
bash ./deploy/deploy-production.sh
```

### 6. Setup SSL Certificate

```bash
# Install SSL certificate (replace with your domain)
sudo certbot --nginx -d poolsafe.com -d www.poolsafe.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔧 GitHub Actions Auto-Deployment

### Setup GitHub Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

1. **VPS_HOST**: Your VPS IP address (e.g., `192.168.1.100`)
2. **VPS_USER**: Your VPS username (e.g., `root` or `ubuntu`)
3. **VPS_SSH_KEY**: Your private SSH key content

### Generate SSH Key for Deployment

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/poolsafe_deploy_key

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/poolsafe_deploy_key.pub user@your-vps-ip

# Copy private key content for GitHub secret
cat ~/.ssh/poolsafe_deploy_key
# Copy this entire content to GitHub secrets as VPS_SSH_KEY
```

### Test Auto-Deployment

1. Push code to `main` branch
2. GitHub Actions will automatically:
   - Run all tests
   - Deploy to your VPS
   - Restart services

## 🔍 Monitoring & Maintenance

### Check Application Status

```bash
# Check backend service
sudo systemctl status poolsafe-backend

# Check nginx
sudo systemctl status nginx

# View backend logs
sudo journalctl -u poolsafe-backend -f

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Update Application

```bash
cd /var/www/poolsafe-portal
git pull origin main

# Rebuild and restart
cd backend && npm ci --production && npm run build
cd ../frontend && npm ci --production && npm run build
sudo systemctl restart poolsafe-backend
sudo systemctl reload nginx
```

### Backup Database

```bash
# For Postgres, consider pg_dump:
# pg_dump --dbname "$DATABASE_URL" | gzip > /backup/db-$(date +%Y%m%d).sql.gz
```

## 🛡️ Security Considerations

1. **Firewall Setup**:

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

1. **Regular Updates**:

```bash
sudo apt update && sudo apt upgrade -y
```

1. **Environment Security**:
   - Never commit `.env` files to git
   - Use strong JWT secrets (64+ characters)
   - Use app passwords for email services
   - Regularly rotate API keys

## 📊 Performance Optimization

### PM2 Process Management (Alternative/manual)

```bash
# Install PM2
sudo npm install -g pm2

# Start application with PM2
cd /var/www/poolsafe-portal/backend
pm2 start dist/index.js -i max --name "poolsafe-backend"
pm2 startup
pm2 save
```

### Nginx Optimizations

Add to your Nginx config for better performance:

```nginx
# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Enable caching
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Port 3000 already in use**:

```bash
sudo lsof -ti:3000 | xargs sudo kill -9
```

1. **Permission denied**:

```bash
sudo chown -R $USER:$USER /var/www/poolsafe-portal
```

1. **Nginx test failed**:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

1. **Database connection issues**:

```bash
cd /var/www/poolsafe-portal/backend
npx prisma generate
npx prisma db push
```

### Monitoring Commands

```bash
# CPU and memory usage
htop

# Disk space
df -h

# Network connections
netstat -tulpn | grep :3000

# Application logs
sudo journalctl -u poolsafe-backend --since "1 hour ago"
```

## 💰 Cost Estimation

**Monthly VPS Costs**:

- **Basic Setup** (2GB RAM): $5-10/month
- **Production Ready** (4GB RAM): $10-20/month
- **High Traffic** (8GB+ RAM): $20-40/month

**Additional Costs**:

- Domain name: $10-15/year
- SSL Certificate: Free (Let's Encrypt)
- Email service: $0-10/month (depending on volume)

## 📞 Support

For deployment issues:

1. Check the troubleshooting section above
2. Review application logs: `sudo journalctl -u poolsafe-backend -f`
3. Verify all environment variables are set correctly
4. Ensure your domain DNS is properly configured

Your Pool Safe Inc Portal should now be live and accessible at `https://your-domain.com`! 🚀
