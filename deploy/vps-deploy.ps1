# VPS Deployment Script for Pool Safe Inc Portal (Windows PowerShell)
# This script automates the complete deployment to Windows VPS

param(
    [string]$Action = "deploy"
)

# Configuration
$APP_NAME = "pool-safe-portal"
$BACKEND_PORT = 4000
$FRONTEND_PORT = 3000
$DB_NAME = "poolsafe_production"
$BACKUP_DIR = "C:\Backups\PoolSafe"
$LOG_DIR = "C:\Logs\PoolSafe"
$APP_DIR = "C:\Apps\$APP_NAME"

# Logging functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Write-Success { param([string]$Message) Write-Log $Message "SUCCESS" }
function Write-Error { param([string]$Message) Write-Log $Message "ERROR" }
function Write-Warning { param([string]$Message) Write-Log $Message "WARNING" }

# Check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Pre-deployment checks
function Test-Prerequisites {
    Write-Log "Running pre-deployment checks..."
    
    # Check if running as administrator
    if (-not (Test-Administrator)) {
        Write-Error "This script must be run as Administrator"
        exit 1
    }
    
    # Check required software
    $required = @("node", "npm", "git")
    foreach ($cmd in $required) {
        try {
            & $cmd --version | Out-Null
        }
        catch {
            Write-Error "Required command '$cmd' is not installed or not in PATH"
            exit 1
        }
    }
    
    # Check Node.js version
    $nodeVersion = (node --version) -replace "v", ""
    $requiredVersion = [version]"18.0.0"
    if ([version]$nodeVersion -lt $requiredVersion) {
        Write-Error "Node.js version $requiredVersion or higher required. Current: $nodeVersion"
        exit 1
    }
    
    # Check available disk space (require at least 2GB)
    $drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
    $freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
    if ($freeSpaceGB -lt 2) {
        Write-Error "Insufficient disk space. Required: 2GB, Available: ${freeSpaceGB}GB"
        exit 1
    }
    
    # Check if ports are available
    $usedPorts = Get-NetTCPConnection | Where-Object { $_.LocalPort -in @($BACKEND_PORT, $FRONTEND_PORT) }
    if ($usedPorts) {
        Write-Error "Required ports are already in use: $($usedPorts.LocalPort -join ', ')"
        exit 1
    }
    
    Write-Success "All pre-deployment checks passed"
}

# Create necessary directories
function New-AppDirectories {
    Write-Log "Setting up directories..."
    
    $dirs = @($BACKUP_DIR, $LOG_DIR, $APP_DIR, "$APP_DIR\backend", "$APP_DIR\frontend")
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-Success "Directories created successfully"
}

# Setup PostgreSQL database
function Set-Database {
    Write-Log "Setting up PostgreSQL database..."
    
    # Check if PostgreSQL is installed
    try {
        psql --version | Out-Null
    }
    catch {
        Write-Error "PostgreSQL is not installed. Please install it first."
        exit 1
    }
    
    # Create database if it doesn't exist
    try {
        $dbExists = psql -U postgres -lqt | Select-String $DB_NAME
        if (-not $dbExists) {
            Write-Log "Creating database $DB_NAME..."
            psql -U postgres -c "CREATE DATABASE $DB_NAME;" | Out-Null
            psql -U postgres -c "CREATE USER poolsafe_user WITH PASSWORD 'secure_password_change_me';" | Out-Null
            psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO poolsafe_user;" | Out-Null
            Write-Success "Database created successfully"
        }
        else {
            Write-Log "Database $DB_NAME already exists"
        }
    }
    catch {
        Write-Error "Failed to setup database: $_"
        exit 1
    }
}

# Deploy application code
function Deploy-Application {
    Write-Log "Deploying application code..."
    
    Set-Location $APP_DIR
    
    # Clone or update repository
    if (-not (Test-Path ".git")) {
        Write-Log "Cloning repository..."
        git clone https://github.com/faith233525/Fatima-Pool-Safe-Inc-Portal-2025-Final-.git . | Out-Null
    }
    else {
        Write-Log "Updating repository..."
        git fetch origin | Out-Null
        git reset --hard origin/main | Out-Null
    }
    
    # Install backend dependencies
    Write-Log "Installing backend dependencies..."
    Set-Location "$APP_DIR\backend"
    npm ci --production=false | Out-Null
    
    # Build backend
    Write-Log "Building backend..."
    npm run build | Out-Null
    
    # Install frontend dependencies
    Write-Log "Installing frontend dependencies..."
    Set-Location "$APP_DIR\frontend"
    npm ci --production=false | Out-Null
    
    # Build frontend
    Write-Log "Building frontend..."
    npm run build | Out-Null
    
    Set-Location $APP_DIR
    Write-Success "Application deployed successfully"
}

# Configure environment variables
function Set-Environment {
    Write-Log "Setting up environment variables..."
    
    # Generate secure secrets
    $jwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))
    $refreshSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))
    $sessionSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))
    $cookieSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))
    
    # Create backend .env file
    $backendEnv = @"
NODE_ENV=production
PORT=$BACKEND_PORT
DATABASE_URL=postgresql://poolsafe_user:secure_password_change_me@localhost:5432/$DB_NAME

# JWT Configuration
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=$refreshSecret
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
SESSION_SECRET=$sessionSecret
COOKIE_SECRET=$cookieSecret

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
LOG_FILE_PATH=$LOG_DIR\app.log

# Health Check
HEALTH_CHECK_PATH=/api/health
"@
    
    $backendEnv | Out-File -FilePath "$APP_DIR\backend\.env" -Encoding UTF8
    
    # Create frontend environment file
    $frontendEnv = @"
VITE_API_BASE_URL=http://localhost:$BACKEND_PORT
VITE_APP_NAME=Pool Safe Inc Portal
VITE_VERSION=1.0.0
NODE_ENV=production
"@
    
    $frontendEnv | Out-File -FilePath "$APP_DIR\frontend\.env" -Encoding UTF8
    
    Write-Success "Environment variables configured"
}

# Setup Windows services
function Set-Services {
    Write-Log "Setting up Windows services..."
    
    # Install node-windows if not already installed
    Set-Location "$APP_DIR\backend"
    try {
        npm list node-windows | Out-Null
    }
    catch {
        npm install node-windows | Out-Null
    }
    
    # Create service installation script
    $serviceScript = @"
var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'Pool Safe Backend',
  description: 'Pool Safe Inc Portal Backend Service',
  script: '$APP_DIR\\backend\\dist\\index.js',
  env: {
    name: 'NODE_ENV',
    value: 'production'
  }
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();
"@
    
    $serviceScript | Out-File -FilePath "install-service.js" -Encoding UTF8
    node install-service.js | Out-Null
    
    Write-Success "Windows services configured"
}

# Setup IIS for frontend (alternative to nginx on Windows)
function Set-IIS {
    Write-Log "Configuring IIS..."
    
    # Enable IIS features
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent -All | Out-Null
    
    # Import WebAdministration module
    Import-Module WebAdministration
    
    # Create application pool
    if (Get-IISAppPool -Name "PoolSafePool" -ErrorAction SilentlyContinue) {
        Remove-IISAppPool -Name "PoolSafePool" -Confirm:$false
    }
    New-IISAppPool -Name "PoolSafePool"
    Set-ItemProperty -Path "IIS:\AppPools\PoolSafePool" -Name processModel.identityType -Value ApplicationPoolIdentity
    
    # Create website
    if (Get-IISSite -Name "PoolSafe" -ErrorAction SilentlyContinue) {
        Remove-IISSite -Name "PoolSafe" -Confirm:$false
    }
    New-IISSite -Name "PoolSafe" -ApplicationPool "PoolSafePool" -PhysicalPath "$APP_DIR\frontend\dist" -Port 80
    
    # Create URL rewrite rules for API proxy
    $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:$BACKEND_PORT/api/{R:1}" />
                </rule>
                <rule name="SPA Fallback" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/index.html" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
"@
    
    $webConfig | Out-File -FilePath "$APP_DIR\frontend\dist\web.config" -Encoding UTF8
    
    Write-Success "IIS configured"
}

# Run database migrations
function Invoke-Migrations {
    Write-Log "Running database migrations..."
    
    Set-Location "$APP_DIR\backend"
    
    # Generate Prisma client
    npx prisma generate | Out-Null
    
    # Run migrations
    npx prisma db push | Out-Null
    
    # Seed database if needed
    if (Test-Path "scripts\seed.ts") {
        Write-Log "Seeding database..."
        npm run seed | Out-Null
    }
    
    Write-Success "Database migrations completed"
}

# Start services
function Start-Services {
    Write-Log "Starting services..."
    
    # Start backend service
    Start-Service "Pool Safe Backend"
    Start-Sleep -Seconds 3
    
    # Start IIS
    Start-Service W3SVC
    
    Write-Success "All services started"
}

# Health checks
function Test-Health {
    Write-Log "Running health checks..."
    
    $maxAttempts = 30
    $attempt = 1
    
    # Check backend health
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:$BACKEND_PORT/api/health" -TimeoutSec 5
            if ($response.ok) {
                Write-Success "Backend health check passed"
                break
            }
        }
        catch {
            Write-Warning "Backend health check attempt $attempt/$maxAttempts failed, retrying in 2 seconds..."
            Start-Sleep -Seconds 2
            $attempt++
        }
    }
    
    if ($attempt -gt $maxAttempts) {
        Write-Error "Backend health check failed after $maxAttempts attempts"
        return $false
    }
    
    # Check frontend
    $attempt = 1
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost" -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "Frontend health check passed"
                break
            }
        }
        catch {
            Write-Warning "Frontend health check attempt $attempt/$maxAttempts failed, retrying in 2 seconds..."
            Start-Sleep -Seconds 2
            $attempt++
        }
    }
    
    if ($attempt -gt $maxAttempts) {
        Write-Error "Frontend health check failed after $maxAttempts attempts"
        return $false
    }
    
    Write-Success "All health checks passed"
    return $true
}

# Create backup
function New-Backup {
    Write-Log "Creating backup..."
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$BACKUP_DIR\poolsafe_backup_$timestamp.sql"
    
    # Database backup
    pg_dump $DB_NAME | Out-File -FilePath $backupFile -Encoding UTF8
    
    # Compress backup
    Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
    Remove-Item $backupFile
    
    # Keep only last 5 backups
    Get-ChildItem -Path $BACKUP_DIR -Filter "poolsafe_backup_*.zip" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -Skip 5 | 
        Remove-Item -Force
    
    Write-Success "Backup created: $backupFile.zip"
}

# Show deployment status
function Show-Status {
    Write-Log "Deployment Status:"
    Write-Host ""
    
    # Service status
    Write-Host "Services:"
    $backendService = Get-Service "Pool Safe Backend" -ErrorAction SilentlyContinue
    if ($backendService -and $backendService.Status -eq "Running") {
        Write-Host "  ✓ Backend: Running" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Backend: Not running" -ForegroundColor Red
    }
    
    $iisService = Get-Service W3SVC -ErrorAction SilentlyContinue
    if ($iisService -and $iisService.Status -eq "Running") {
        Write-Host "  ✓ IIS: Running" -ForegroundColor Green
    } else {
        Write-Host "  ✗ IIS: Not running" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "URLs:"
    Write-Host "  Frontend: http://localhost"
    Write-Host "  Backend API: http://localhost/api"
    Write-Host "  Health Check: http://localhost/api/health"
    
    Write-Host ""
    Write-Host "Logs:"
    Write-Host "  Backend: Get-EventLog -LogName Application -Source 'Pool Safe Backend'"
    Write-Host "  IIS: Get-EventLog -LogName System -Source 'Microsoft-Windows-IIS'"
    Write-Host "  Application: Get-Content '$LOG_DIR\app.log' -Tail 50"
}

# Main deployment function
function Invoke-Deployment {
    Write-Log "Starting VPS deployment for Pool Safe Inc Portal..."
    
    Test-Prerequisites
    New-AppDirectories
    Set-Database
    Deploy-Application
    Set-Environment
    Invoke-Migrations
    Set-Services
    Set-IIS
    Start-Services
    
    Write-Log "Running health checks..."
    if (Test-Health) {
        New-Backup
        Write-Success "Deployment completed successfully!"
        Show-Status
    }
    else {
        Write-Error "Deployment failed health checks"
        exit 1
    }
}

# Handle script parameters
switch ($Action.ToLower()) {
    "backup" { New-Backup }
    "status" { Show-Status }
    "health" { Test-Health }
    "restart" { 
        Restart-Service "Pool Safe Backend"
        Restart-Service W3SVC
        Write-Log "Services restarted"
    }
    default { Invoke-Deployment }
}