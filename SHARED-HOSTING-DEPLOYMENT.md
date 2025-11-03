# 🌐 SHARED HOSTING DEPLOYMENT GUIDE
## Pool Safe Inc Portal - cPanel/Shared Hosting

**⚠️ IMPORTANT**: This guide is for **shared hosting** (cPanel) where Node.js backend is **NOT available**.

---

## 🎯 **Solution for Shared Hosting**

Since shared hosting doesn't support Node.js backends, you have **2 options**:

### **Option 1: Frontend Only + External Backend** (Recommended)
- Deploy frontend to shared hosting (cPanel)
- Deploy backend to external service:
  - **Heroku** (Free tier available)
  - **Railway.app** (Free tier available)
  - **Render.com** (Free tier available)
  - **DigitalOcean App Platform** ($5/month)
  - **AWS Elastic Beanstalk**
  - **Google Cloud Run**

### **Option 2: Full Migration to VPS/Cloud**
- Move everything to a VPS where you have full control:
  - **DigitalOcean Droplet** ($6/month)
  - **Linode** ($5/month)
  - **Vultr** ($6/month)
  - **AWS EC2**

---

## ✅ **OPTION 1: Frontend on Shared Hosting + Backend on Render.com** (FREE)

This is the **easiest and FREE** solution for shared hosting.

### **Step 1: Deploy Backend to Render.com** (FREE, 10 minutes)

#### 1. Create Render.com Account:
- Go to https://render.com
- Sign up for free account
- Connect your GitHub account

#### 2. Push Backend to GitHub:
```bash
cd backend
git init
git add .
git commit -m "Initial backend commit"
git remote add origin https://github.com/yourusername/poolsafe-backend.git
git push -u origin main
```

#### 3. Create PostgreSQL Database on Render:
- In Render dashboard, click **New** → **PostgreSQL**
- Name: `poolsafe-db`
- Database: `poolsafe`
- User: (auto-generated)
- Region: Choose closest to you
- Plan: **Free**
- Click **Create Database**
- Copy the **Internal Database URL** (starts with `postgresql://`)

#### 4. Deploy Backend Web Service on Render:
- Click **New** → **Web Service**
- Connect your GitHub repository
- Configure:
  - **Name**: `poolsafe-backend`
  - **Environment**: `Node`
  - **Region**: Same as database
  - **Branch**: `main`
  - **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
  - **Start Command**: `node dist/index.js`
  - **Plan**: **Free**

#### 5. Add Environment Variables in Render:
Click **Environment** tab and add:

```env
DATABASE_URL=<paste-internal-database-url-from-step-3>
JWT_SECRET=your-random-32-character-secret-here
NODE_ENV=production
PORT=3001

# Admin
ADMIN_EMAILS=support@poolsafeinc.com,fabdi@poolsafeinc.com
INTERNAL_EMAIL_DOMAIN=poolsafeinc.com

# Email (Outbound)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=support@poolsafeinc.com
SMTP_PASS=YourEmailPassword
SMTP_FROM=support@poolsafeinc.com

# Email (Inbound)
SUPPORT_EMAIL_USER=support@poolsafeinc.com
SUPPORT_EMAIL_PASS=YourEmailPassword
SUPPORT_EMAIL_HOST=outlook.office365.com
SUPPORT_EMAIL_PORT=993

# CORS (your domain)
FRONTEND_URL=https://yourdomain.com
```

#### 6. Deploy:
- Click **Create Web Service**
- Wait 5-10 minutes for deployment
- Your backend URL will be: `https://poolsafe-backend.onrender.com`

#### 7. Create Support Account:
Once deployed, run this SQL in Render's PostgreSQL:
- Go to your database in Render
- Click **Connect** → **External Connection**
- Use any PostgreSQL client (e.g., pgAdmin, DBeaver)
- Run:

```sql
INSERT INTO "User" (email, password, role, "displayName", "createdAt", "updatedAt")
VALUES (
  'support@poolsafeinc.com',
  '$2b$10$ufXNLHFmX75YgeksumqK9.RROy1VrQMvG8aow3CdpXosqWtZwbx.q',
  'ADMIN',
  'Pool Safe Support',
  NOW(),
  NOW()
);
```

---

### **Step 2: Update Frontend for External Backend**

#### 1. Update Frontend Environment:
Create `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://poolsafe-backend.onrender.com/api
```

#### 2. Rebuild Frontend:
```bash
cd frontend
npm run build
```

This creates `frontend/dist/` with your backend URL configured.

---

### **Step 3: Deploy Frontend to Shared Hosting (cPanel)**

#### 1. Upload to cPanel:
- Login to cPanel
- Go to **File Manager**
- Navigate to `public_html`
- Delete any existing files (if new site)
- Upload all files from `frontend/dist/`:
  - `index.html`
  - `assets/` folder
  - `chunks/` folder
  - `.htaccess`

#### 2. Verify .htaccess exists:
Create/verify `public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirect to HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
  
  # Handle React Router
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable CORS for API calls
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

#### 3. Test:
- Visit: `https://yourdomain.com`
- Login with: `support@poolsafeinc.com` / `LounGenie123!!`

---

## ✅ **OPTION 2: Deploy Everything to DigitalOcean** ($6/month)

If you want full control and better performance:

### **Step 1: Create DigitalOcean Droplet**

1. Sign up at https://www.digitalocean.com
2. Create a **Droplet**:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($6/month - 1GB RAM)
   - **Datacenter**: Closest to your users
   - **Authentication**: SSH Key (recommended) or Password
3. Create droplet and note the IP address

### **Step 2: Setup Server**

SSH into your server:
```bash
ssh root@your-droplet-ip
```

Install Node.js, PostgreSQL, and Nginx:
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

### **Step 3: Setup Database**

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE poolsafe;
CREATE USER poolsafe_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE poolsafe TO poolsafe_user;
\q
```

### **Step 4: Deploy Backend**

```bash
# Create directory
mkdir -p /var/www/poolsafe-backend
cd /var/www/poolsafe-backend

# Upload your backend files (use SCP or Git)
# Then:
npm install --production
npm run build

# Create .env file (see environment variables from Option 1)

# Run migrations
npx prisma migrate deploy

# Start with PM2
pm2 start dist/index.js --name poolsafe-backend
pm2 save
pm2 startup
```

### **Step 5: Deploy Frontend**

```bash
# Create directory
mkdir -p /var/www/poolsafe-frontend
cd /var/www/poolsafe-frontend

# Upload frontend/dist files here
```

### **Step 6: Configure Nginx**

Create `/etc/nginx/sites-available/poolsafe`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/poolsafe-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/poolsafe /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### **Step 7: Add SSL Certificate**

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## 📧 **Email Configuration (Same for Both Options)**

Add these DNS records:

### SPF Record:
```
Type: TXT
Name: @
Value: v=spf1 include:spf.protection.outlook.com ~all
```

### DKIM Records:
(Get from Microsoft 365 Admin → DKIM settings)

### DMARC Record:
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:support@poolsafeinc.com; pct=100
```

---

## 🆚 **Comparison: Which Option to Choose?**

| Feature | Render.com (Free) | DigitalOcean ($6/mo) |
|---------|------------------|---------------------|
| **Cost** | FREE | $6/month |
| **Setup Time** | 10 minutes | 30 minutes |
| **Performance** | Good (free tier limits) | Better |
| **Scaling** | Auto (paid plans) | Manual |
| **SSL** | Automatic | Manual (easy) |
| **Database** | Included (500MB free) | Full control |
| **Best For** | Testing, small teams | Production, growth |

---

## ✅ **Recommended Approach**

### **For Your Situation (Shared Hosting)**:

1. **NOW (Quick Start)**:
   - Deploy backend to **Render.com** (FREE)
   - Deploy frontend to **cPanel** (your existing hosting)
   - Test everything
   - Go live quickly

2. **LATER (When You Grow)**:
   - Migrate to **DigitalOcean** or similar VPS
   - Better performance
   - More control
   - Custom domain for API

---

## 🚀 **Quick Start with Render.com (30 Minutes)**

### Step-by-Step:

1. **Backend** (15 min):
   - [ ] Create Render.com account
   - [ ] Create PostgreSQL database
   - [ ] Push backend to GitHub
   - [ ] Create web service on Render
   - [ ] Add environment variables
   - [ ] Wait for deployment
   - [ ] Create support account (SQL)

2. **Frontend** (10 min):
   - [ ] Update `.env.production` with Render backend URL
   - [ ] Rebuild frontend: `npm run build`
   - [ ] Upload `dist/` to cPanel `public_html`
   - [ ] Verify `.htaccess` exists

3. **DNS** (5 min):
   - [ ] Add SPF, DKIM, DMARC records

4. **Test** (10 min):
   - [ ] Login as support
   - [ ] Create test partner
   - [ ] Submit test ticket
   - [ ] Test email-to-ticket

---

## 📝 **Next Steps**

Would you like me to:
1. Create a GitHub repository for your backend?
2. Generate the exact Render.com configuration?
3. Create updated frontend build with Render backend URL?
4. Provide detailed Render.com deployment screenshots?

**Let me know and I'll help you get live on shared hosting TODAY!** 🚀
