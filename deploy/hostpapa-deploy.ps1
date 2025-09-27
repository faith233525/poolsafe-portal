# HostPapa Deployment Script - Pool Safe Inc Portal
# PowerShell version for Windows

Write-Host "🚀 Starting HostPapa Deployment Preparation..." -ForegroundColor Green

# Set variables
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "frontend"
$BackendDir = Join-Path $ProjectRoot "backend"
$DeployDir = Join-Path $ProjectRoot "hostpapa-deploy"

# Create deployment directory
Write-Host "📁 Creating deployment directory..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DeployDir "frontend") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DeployDir "backend") | Out-Null

# Build Frontend
Write-Host "🎨 Building frontend for production..." -ForegroundColor Blue
Set-Location $FrontendDir
npm run build

# Copy frontend build to deployment directory
Write-Host "📋 Copying frontend files..." -ForegroundColor Blue
$FrontendDist = Join-Path $FrontendDir "dist"
$FrontendDeploy = Join-Path $DeployDir "frontend"
Copy-Item -Path "$FrontendDist\*" -Destination $FrontendDeploy -Recurse -Force

# Build Backend
Write-Host "⚙️ Building backend for production..." -ForegroundColor Blue
Set-Location $BackendDir
npm run build

# Copy backend files to deployment directory
Write-Host "📋 Copying backend files..." -ForegroundColor Blue
$BackendDeploy = Join-Path $DeployDir "backend"
Copy-Item -Path (Join-Path $BackendDir "dist") -Destination $BackendDeploy -Recurse -Force
Copy-Item -Path (Join-Path $BackendDir "package.json") -Destination $BackendDeploy -Force
Copy-Item -Path (Join-Path $BackendDir "package-lock.json") -Destination $BackendDeploy -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $BackendDir "prisma") -Destination $BackendDeploy -Recurse -Force

# Create .htaccess for frontend
Write-Host "🔧 Creating .htaccess for frontend..." -ForegroundColor Blue
$HtaccessContent = @"
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
"@

Set-Content -Path (Join-Path $FrontendDeploy ".htaccess") -Value $HtaccessContent

# Create production environment template
Write-Host "📝 Creating environment template..." -ForegroundColor Blue
$EnvTemplate = @"
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
"@

Set-Content -Path (Join-Path $BackendDeploy ".env.template") -Value $EnvTemplate

# Create deployment instructions
Write-Host "📋 Creating deployment instructions..." -ForegroundColor Blue
$Instructions = @"
# HostPapa Deployment Instructions

## Upload Files:

### Frontend (Upload to public_html/):
1. Upload all files from ``frontend/`` folder to your domain's public_html directory
2. The .htaccess file is included for proper routing

### Backend (Upload to Node.js App directory):
1. Create Node.js app in HostPapa cPanel
2. Upload all files from ``backend/`` folder to your Node.js app directory
3. Copy ``.env.template`` to ``.env`` and configure with your actual values

## Server Setup:
1. SSH into your HostPapa server or use cPanel Terminal
2. Navigate to your Node.js app directory
3. Run: ``npm install --production``
4. Run: ``npx prisma generate``
5. Run: ``npx prisma migrate deploy``
6. Start the app: ``npm start``

## Database Setup:
1. Create MySQL database in cPanel
2. Update DATABASE_URL in .env file
3. Run database migrations

## SSL Setup:
1. Enable SSL certificates for both domains in cPanel
2. Force HTTPS redirect

Your application is ready for production! 🚀
"@

Set-Content -Path (Join-Path $DeployDir "DEPLOYMENT-INSTRUCTIONS.md") -Value $Instructions

# Create zip files for easy upload
Write-Host "📦 Creating zip files for upload..." -ForegroundColor Blue
Set-Location $DeployDir

# Create frontend zip
Compress-Archive -Path (Join-Path $DeployDir "frontend\*") -DestinationPath (Join-Path $DeployDir "frontend-hostpapa.zip") -Force

# Create backend zip  
Compress-Archive -Path (Join-Path $DeployDir "backend\*") -DestinationPath (Join-Path $DeployDir "backend-hostpapa.zip") -Force

Write-Host ""
Write-Host "✅ HostPapa deployment preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Files ready in: $DeployDir" -ForegroundColor Yellow
Write-Host "📦 Upload files:" -ForegroundColor Yellow
Write-Host "   - frontend-hostpapa.zip → Extract to public_html/" -ForegroundColor Cyan
Write-Host "   - backend-hostpapa.zip → Extract to Node.js app directory" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload zip files to HostPapa" -ForegroundColor White
Write-Host "2. Extract files in correct directories" -ForegroundColor White
Write-Host "3. Configure .env file with your database credentials" -ForegroundColor White
Write-Host "4. Run 'npm install' on the server" -ForegroundColor White
Write-Host "5. Setup database and run migrations" -ForegroundColor White
Write-Host "6. Start the Node.js application" -ForegroundColor White
Write-Host ""
Write-Host "📖 See DEPLOYMENT-INSTRUCTIONS.md for detailed steps" -ForegroundColor Magenta
Write-Host ""
Write-Host "🎉 Your Portal is ready for HostPapa deployment!" -ForegroundColor Green