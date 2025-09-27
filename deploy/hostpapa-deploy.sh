#!/bin/bash

# HostPapa Deployment Script - Pool Safe Inc Portal
# This script prepares files for HostPapa upload

echo "🚀 Starting HostPapa Deployment Preparation..."

# Set variables
PROJECT_ROOT="$(dirname "$0")/.."
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
DEPLOY_DIR="$PROJECT_ROOT/hostpapa-deploy"

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/frontend"
mkdir -p "$DEPLOY_DIR/backend"

# Build Frontend
echo "🎨 Building frontend for production..."
cd "$FRONTEND_DIR"
npm run build

# Copy frontend build to deployment directory
echo "📋 Copying frontend files..."
cp -r "$FRONTEND_DIR/dist/"* "$DEPLOY_DIR/frontend/"

# Build Backend
echo "⚙️ Building backend for production..."
cd "$BACKEND_DIR"
npm run build

# Copy backend files to deployment directory
echo "📋 Copying backend files..."
cp -r "$BACKEND_DIR/dist" "$DEPLOY_DIR/backend/"
cp "$BACKEND_DIR/package.json" "$DEPLOY_DIR/backend/"
cp "$BACKEND_DIR/package-lock.json" "$DEPLOY_DIR/backend/" 2>/dev/null || true
cp -r "$BACKEND_DIR/prisma" "$DEPLOY_DIR/backend/"
cp -r "$BACKEND_DIR/node_modules" "$DEPLOY_DIR/backend/" 2>/dev/null || echo "⚠️ Note: node_modules not copied - run 'npm install' on server"

# Create .htaccess for frontend
echo "🔧 Creating .htaccess for frontend..."
cat > "$DEPLOY_DIR/frontend/.htaccess" << 'EOF'
RewriteEngine On

# Handle React Router
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security Headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"

# HTTPS Redirect
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Cache Control
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
EOF

# Create production environment template
echo "📝 Creating environment template..."
cat > "$DEPLOY_DIR/backend/.env.template" << 'EOF'
# HostPapa Production Environment
# Copy this to .env and fill in your actual values

# Database Configuration
DATABASE_URL="mysql://your_db_user:your_db_password@localhost:3306/poolsafe_portal"

# JWT Configuration  
JWT_SECRET="your-super-secure-jwt-secret-key-here-change-this"

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Origins (replace with your actual domains)
CORS_ORIGINS="https://yourdomain.com,https://api.yourdomain.com"

# Email Configuration (optional)
SMTP_HOST="mail.yourdomain.com"
SMTP_PORT=587
SMTP_USER="noreply@yourdomain.com" 
SMTP_PASS="your-email-password"

# Optional: Monitoring
SENTRY_DSN="your-sentry-dsn-if-using"
EOF

# Create deployment instructions
echo "📋 Creating deployment instructions..."
cat > "$DEPLOY_DIR/DEPLOYMENT-INSTRUCTIONS.md" << 'EOF'
# HostPapa Deployment Instructions

## Upload Files:

### Frontend (Upload to public_html/):
1. Upload all files from `frontend/` folder to your domain's public_html directory
2. The .htaccess file is included for proper routing

### Backend (Upload to Node.js App directory):
1. Create Node.js app in HostPapa cPanel
2. Upload all files from `backend/` folder to your Node.js app directory
3. Copy `.env.template` to `.env` and configure with your actual values

## Server Setup:
1. SSH into your HostPapa server or use cPanel Terminal
2. Navigate to your Node.js app directory
3. Run: `npm install --production`
4. Run: `npx prisma generate`
5. Run: `npx prisma migrate deploy`
6. Start the app: `npm start`

## Database Setup:
1. Create MySQL database in cPanel
2. Update DATABASE_URL in .env file
3. Run database migrations

## SSL Setup:
1. Enable SSL certificates for both domains in cPanel
2. Force HTTPS redirect

Your application is ready for production! 🚀
EOF

# Create zip files for easy upload
echo "📦 Creating zip files for upload..."
cd "$DEPLOY_DIR"
zip -r "frontend-hostpapa.zip" frontend/
zip -r "backend-hostpapa.zip" backend/

echo ""
echo "✅ HostPapa deployment preparation complete!"
echo ""
echo "📁 Files ready in: $DEPLOY_DIR"
echo "📦 Upload files:"
echo "   - frontend-hostpapa.zip → Extract to public_html/"
echo "   - backend-hostpapa.zip → Extract to Node.js app directory"
echo ""
echo "📋 Next steps:"
echo "1. Upload zip files to HostPapa"
echo "2. Extract files in correct directories"
echo "3. Configure .env file with your database credentials"
echo "4. Run 'npm install' on the server"
echo "5. Setup database and run migrations"
echo "6. Start the Node.js application"
echo ""
echo "📖 See DEPLOYMENT-INSTRUCTIONS.md for detailed steps"
echo ""
echo "🎉 Your Portal is ready for HostPapa deployment!"