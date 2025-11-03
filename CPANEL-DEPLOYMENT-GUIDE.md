# cPanel Deployment Guide - Pool Safe Inc Portal

## ✅ Pre-Deployment Checklist

All features are implemented and ready for deployment:
- ✅ Backend build: PASS
- ✅ Frontend build: PASS (352KB bundle)
- ✅ Support can upload videos (requireSupport)
- ✅ Support can login via Outlook (any @poolsafeinc.com email)
- ✅ Admin can login via Outlook OR password
- ✅ Partners login via Outlook SSO only
- ✅ .htaccess configured for SPA routing
- ✅ index.html exists in dist folder

---

## 📦 What to Upload to cPanel

### Option 1: ZIP Upload (Recommended)
1. Create a ZIP file of the `frontend/dist` folder contents
2. Upload to cPanel File Manager
3. Extract in public_html (or subdirectory)

### Option 2: Direct Upload
Upload all files from `frontend/dist` to your cPanel public_html directory:
- ✅ index.html (main entry point)
- ✅ .htaccess (SPA routing configuration)
- ✅ assets/ folder (CSS and JS bundles)
- ✅ chunks/ folder (code splitting)
- ✅ favicon.svg, manifest.json, sw.js
- ✅ robots.txt, sitemap.xml
- ✅ All logo files

---

## 🔧 Backend API Configuration

You have **2 options** for connecting frontend to backend:

### Option A: Same Server (Backend on cPanel)
If your backend runs on the same cPanel server:

1. **Deploy Backend**:
   - Upload backend files to a subdirectory (e.g., `api/`)
   - Configure Node.js app in cPanel
   - Set environment variables (see below)

2. **Proxy API Calls**:
   - The `.htaccess` already skips `/api/` routes
   - Configure reverse proxy OR use subdomain

### Option B: External Backend Server
If backend runs on separate server (VPS, cloud, etc.):

1. **Update API Base URL**:
   Edit `frontend/.env.production` or rebuild with:
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com npm run build
   ```

2. **Enable CORS** on backend:
   Add your domain to CORS whitelist in backend configuration

---

## 🔑 Required Environment Variables (Backend)

Create `.env` file in backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/poolsafe

# JWT Secret (generate secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Azure AD SSO (for Outlook login)
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
REDIRECT_URI=https://yourdomain.com/api/auth/sso/callback

# Admin Configuration
ADMIN_EMAILS=support@poolsafeinc.com,fabdi@poolsafeinc.com
INTERNAL_EMAIL_DOMAIN=poolsafeinc.com

# Partner Login (disabled by default)
PARTNER_PASSWORD_LOGIN_ENABLED=false

# Node Environment
NODE_ENV=production
PORT=3001
```

---

## 📋 Step-by-Step Deployment to cPanel

### Step 1: Prepare ZIP File
```powershell
# From your project root
cd frontend/dist
Compress-Archive -Path * -DestinationPath ../pool-safe-portal.zip
```

### Step 2: Upload to cPanel
1. Login to cPanel
2. Open **File Manager**
3. Navigate to `public_html`
4. Click **Upload**
5. Select `pool-safe-portal.zip`
6. Wait for upload to complete

### Step 3: Extract ZIP
1. In File Manager, select `pool-safe-portal.zip`
2. Click **Extract**
3. Choose destination (public_html or subdirectory)
4. Click **Extract Files**
5. Delete the ZIP file after extraction

### Step 4: Verify Files
Confirm these files are in public_html:
- ✅ index.html
- ✅ .htaccess
- ✅ assets/ (folder with CSS/JS)
- ✅ chunks/ (folder)

### Step 5: Configure Backend (if on same server)
1. Go to **Setup Node.js App** in cPanel
2. Create new application:
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Application root: `/home/username/backend`
   - Application URL: api.yourdomain.com or /api
   - Application startup file: dist/index.js

3. Set environment variables (click "Edit" on your app)

4. Click **Run NPM Install**

5. Start the application

### Step 6: Test Deployment
1. Visit your domain (e.g., https://yourdomain.com)
2. You should see the Pool Safe Inc Portal login page
3. Try logging in with:
   - **Support**: support@poolsafeinc.com (password)
   - **Admin Outlook**: fabdi@poolsafeinc.com (Outlook SSO)

---

## 🔄 API Proxy Configuration

If backend is on same server, add to `.htaccess` (already configured to skip /api):

```apache
# API calls are NOT rewritten
RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^ - [L]
```

For reverse proxy (if mod_proxy available):
```apache
<IfModule mod_proxy.c>
  ProxyPass /api http://localhost:3001/api
  ProxyPassReverse /api http://localhost:3001/api
</IfModule>
```

---

## 🧪 Post-Deployment Testing

### Test Login Flows
- [ ] Support login via password (support@poolsafeinc.com)
- [ ] Admin login via password (support@poolsafeinc.com)
- [ ] Admin login via Outlook (fabdi@poolsafeinc.com)
- [ ] Partner login via Outlook (partner email)

### Test Admin Features
- [ ] Upload logo (PNG, JPG, SVG, WebP)
- [ ] Upload video (MP4, WebM, MOV, AVI)
- [ ] Import partners via CSV
- [ ] Import users via CSV
- [ ] View partner map

### Test Support Features
- [ ] Upload video (support can upload videos)
- [ ] Create tickets
- [ ] Edit partner details
- [ ] View partner lock information

### Test Partner Features
- [ ] View tickets
- [ ] Create tickets
- [ ] View profile
- [ ] Cannot access admin features

---

## 🐛 Troubleshooting

### Issue: "404 Not Found" on page refresh
**Solution**: Verify `.htaccess` exists and mod_rewrite is enabled

### Issue: API calls return 404
**Solutions**:
- Check API base URL configuration
- Verify backend is running
- Check CORS settings
- Verify proxy configuration

### Issue: Login with Outlook fails
**Solutions**:
- Verify Azure AD credentials in .env
- Check REDIRECT_URI matches your domain
- Ensure email is in Contact table (for partners)
- Ensure email ends with @poolsafeinc.com (for support)

### Issue: File uploads fail
**Solutions**:
- Check uploads/assets directory exists and is writable
- Verify file size limits (100MB for videos)
- Check backend logs for errors

---

## 📊 File Structure on cPanel

After deployment, your public_html should look like:

```
public_html/
├── index.html                    ← Main entry point
├── .htaccess                     ← SPA routing config
├── favicon.svg
├── manifest.json
├── robots.txt
├── sitemap.xml
├── sw.js
├── assets/
│   ├── css/
│   │   └── index-[hash].css     ← Bundled CSS
│   └── index-[hash].js          ← Bundled JS
└── chunks/                       ← Code splitting
    ├── unknown-[hash].js
    └── ...
```

---

## 🔐 Security Checklist

Before going live:
- [ ] Change JWT_SECRET to secure random string
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set strong passwords for admin accounts
- [ ] Configure Azure AD with production credentials
- [ ] Review CORS whitelist
- [ ] Set NODE_ENV=production
- [ ] Disable debug/test pages
- [ ] Review file permissions (uploads directory)

---

## 🚀 Quick Deploy Commands

### Build everything:
```powershell
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

### Create deployment ZIP:
```powershell
cd frontend/dist
Compress-Archive -Path * -DestinationPath ../pool-safe-portal.zip
```

### Upload to cPanel:
1. Use File Manager upload
2. Extract in public_html
3. Done!

---

## ✅ Deployment Complete!

Once deployed, users can:
- **Partners**: Login with Outlook, view tickets, submit requests
- **Support**: Login with password or Outlook, upload videos, manage partners
- **Admin**: All features including logo/video upload, CSV imports, full management

Your portal is ready for production! 🎉

---

## 📞 Support

For deployment issues:
- Check backend logs in cPanel
- Review browser console for frontend errors
- Verify all environment variables are set
- Test API endpoints directly (e.g., /api/health)
