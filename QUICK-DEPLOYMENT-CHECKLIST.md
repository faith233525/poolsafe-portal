# ⚡ QUICK DEPLOYMENT CHECKLIST

## 📦 Your Package: `pool-safe-portal-PRODUCTION.zip`

### ✅ **Pre-Deployment**
- [ ] Extract `pool-safe-portal-PRODUCTION.zip`
- [ ] Read `FINAL-DEPLOYMENT-GUIDE.md` (comprehensive instructions)
- [ ] Have cPanel/server access ready
- [ ] Have PostgreSQL database credentials ready
- [ ] Have email credentials ready (support@poolsafeinc.com)

---

## 🌐 **STEP 1: Deploy Frontend** (5 minutes)

### cPanel Upload:
1. [ ] Login to cPanel
2. [ ] Go to **File Manager**
3. [ ] Navigate to `public_html`
4. [ ] Upload `frontend-dist.zip`
5. [ ] Extract all files in `public_html`
6. [ ] Verify these files exist:
   - `index.html`
   - `.htaccess`
   - `assets/` folder
   - `chunks/` folder
7. [ ] Test: Visit `https://yourdomain.com`

**Expected Result**: Portal login page loads ✓

---

## 🔧 **STEP 2: Deploy Backend** (10 minutes)

### cPanel Node.js App:
1. [ ] In cPanel, go to **Setup Node.js App**
2. [ ] Click **Create Application**
3. [ ] Configure:
   - Node.js Version: **18.x or higher**
   - Application Mode: **Production**
   - Application Root: `/home/yourusername/backend`
   - Application URL: `api.yourdomain.com`
   - Application Startup File: `dist/index.js`
4. [ ] Click **Create**
5. [ ] Upload and extract `backend-dist.zip` to application root
6. [ ] In application directory, run: `npm install --production`
7. [ ] Create `.env` file (see STEP 3)
8. [ ] Click **Restart** in cPanel Node.js interface

**Expected Result**: Backend starts without errors ✓

---

## 🗄️ **STEP 3: Database Setup** (10 minutes)

### Create PostgreSQL Database:
1. [ ] In cPanel, go to **PostgreSQL Databases**
2. [ ] Create database: `poolsafe_prod`
3. [ ] Create user: `poolsafe_user`
4. [ ] Set strong password (save it!)
5. [ ] Add user to database with **ALL PRIVILEGES**
6. [ ] Note connection string:
   ```
   postgresql://poolsafe_user:YOUR_PASSWORD@localhost:5432/poolsafe_prod
   ```

### Create `.env` File:
Create this file in your backend directory:

```env
# Database
DATABASE_URL=postgresql://poolsafe_user:YOUR_PASSWORD@localhost:5432/poolsafe_prod

# JWT Secret (generate random 32+ character string)
JWT_SECRET=REPLACE_WITH_RANDOM_STRING_32_CHARS_MIN

# Admin Configuration
ADMIN_EMAILS=support@poolsafeinc.com,fabdi@poolsafeinc.com
INTERNAL_EMAIL_DOMAIN=poolsafeinc.com

# Email Service (Outbound)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=support@poolsafeinc.com
SMTP_PASS=YOUR_EMAIL_PASSWORD
SMTP_FROM=support@poolsafeinc.com

# Email Service (Inbound - Email-to-Ticket)
SUPPORT_EMAIL_USER=support@poolsafeinc.com
SUPPORT_EMAIL_PASS=YOUR_EMAIL_PASSWORD
SUPPORT_EMAIL_HOST=outlook.office365.com
SUPPORT_EMAIL_PORT=993

# Azure AD (Optional - for Outlook SSO)
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
REDIRECT_URI=https://yourdomain.com/api/auth/sso/callback

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
```

### Run Database Migrations:
```bash
cd /home/yourusername/backend
DATABASE_URL="postgresql://poolsafe_user:YOUR_PASSWORD@localhost:5432/poolsafe_prod" npx prisma migrate deploy
```

### Create Support Account:
Run this SQL in your PostgreSQL database:

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

**Expected Result**: Support account created ✓

---

## 📧 **STEP 4: Email Configuration** (15 minutes)

### Add DNS Records:

1. [ ] **SPF Record**:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:spf.protection.outlook.com ~all
   ```

2. [ ] **DKIM Records**:
   - Go to Microsoft 365 Admin Center
   - Security & Compliance → Threat Management → Policy → DKIM
   - Enable DKIM for poolsafeinc.com
   - Add the CNAME records provided:
   ```
   Type: CNAME
   Name: selector1._domainkey
   Value: selector1-poolsafeinc-com._domainkey.poolsafeinc.onmicrosoft.com
   
   Type: CNAME
   Name: selector2._domainkey
   Value: selector2-poolsafeinc-com._domainkey.poolsafeinc.onmicrosoft.com
   ```

3. [ ] **DMARC Record**:
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=quarantine; rua=mailto:support@poolsafeinc.com; pct=100
   ```

4. [ ] Wait 15-30 minutes for DNS propagation
5. [ ] Test with: https://www.mail-tester.com

**Expected Result**: SPF/DKIM/DMARC all pass ✓

---

## 🔒 **STEP 5: SSL Certificate** (5 minutes)

1. [ ] In cPanel, go to **SSL/TLS Status**
2. [ ] Click **Run AutoSSL** (Let's Encrypt)
3. [ ] Wait for certificate to be issued
4. [ ] Verify HTTPS works on both:
   - https://yourdomain.com (frontend)
   - https://api.yourdomain.com (backend)

**Expected Result**: Green padlock in browser ✓

---

## ✅ **STEP 6: Testing** (15 minutes)

### Test 1: Support Login
1. [ ] Go to portal: https://yourdomain.com
2. [ ] Click "Support/Admin Login"
3. [ ] Enter:
   - Email: `support@poolsafeinc.com`
   - Password: `LounGenie123!!`
4. [ ] Should redirect to admin dashboard

### Test 2: Create Partner Company
1. [ ] In admin dashboard, click "Partners"
2. [ ] Click "Add Partner"
3. [ ] Fill in:
   - Company Name: `Test Hotel`
   - Username: `Test Hotel` (for login)
   - Password: `TestPassword123`
   - Email: `test@testhotel.com`
4. [ ] Save partner

### Test 3: Partner Login
1. [ ] Logout
2. [ ] Click "Partner Login"
3. [ ] Enter:
   - Username: `Test Hotel`
   - Password: `TestPassword123`
4. [ ] Should redirect to partner dashboard

### Test 4: Submit Ticket
1. [ ] As logged-in partner, click "Create Ticket"
2. [ ] Fill in all fields:
   - First Name, Last Name, Position
   - Subject, Category (test all 12 categories)
   - Message
   - Upload test file
3. [ ] Submit
4. [ ] Ticket should appear in list
5. [ ] Check if support received email notification

### Test 5: Email-to-Ticket
1. [ ] Send email to: support@poolsafeinc.com
2. [ ] From: test@testhotel.com
3. [ ] Subject: "Test Email-to-Ticket"
4. [ ] Body: "This is a test ticket from email"
5. [ ] Wait 1 minute
6. [ ] Login as support
7. [ ] Verify ticket was created
8. [ ] Verify it's assigned to "Test Hotel" company

### Test 6: All Categories
1. [ ] Open ticket form
2. [ ] Click category dropdown
3. [ ] Verify all 12 categories appear:
   - [ ] Call Button
   - [ ] Charging
   - [ ] Connectivity
   - [ ] Screen
   - [ ] Locking
   - [ ] General Maintenance
   - [ ] Monitor
   - [ ] Antenna
   - [ ] Gateway
   - [ ] LoRa
   - [ ] General System
   - [ ] Other

---

## 🎉 **STEP 7: GO LIVE!**

### Final Checks:
- [ ] All tests passed
- [ ] SSL certificate active
- [ ] Email deliverability verified
- [ ] Support login works
- [ ] Partner login works
- [ ] Ticket submission works
- [ ] Email-to-ticket works
- [ ] All 12 categories visible
- [ ] File uploads work

### Go Live:
- [ ] Change default password (`LounGenie123!!` → secure password)
- [ ] Create real partner companies
- [ ] Import existing data (if any)
- [ ] Train support staff
- [ ] Announce to partners
- [ ] Monitor for issues

---

## 🆘 **Troubleshooting**

### Can't login as support:
- Password is case-sensitive: `LounGenie123!!`
- Check database: `SELECT * FROM "User" WHERE email = 'support@poolsafeinc.com'`
- Verify role = 'ADMIN'

### Emails not sending:
- Check SMTP credentials in `.env`
- Verify port 587 is open
- Test: `telnet smtp.office365.com 587`
- Check SPF/DKIM/DMARC records

### Email-to-ticket not working:
- Check IMAP credentials in `.env`
- Verify port 993 is open
- Enable IMAP on email account
- Check backend logs for errors

### Backend not starting:
- Check `.env` file exists
- Verify DATABASE_URL is correct
- Check Node.js version (18+)
- View error logs in cPanel

---

## 📞 **Support**

**Default Login**:
- Email: support@poolsafeinc.com
- Password: LounGenie123!!

**Documentation**:
- FINAL-DEPLOYMENT-GUIDE.md (comprehensive)
- PRODUCTION-READY-SUMMARY.md (overview)
- CREATE-SUPPORT-ACCOUNT-INSTRUCTIONS.md (account setup)

**Files**:
- frontend-dist.zip (upload to cPanel public_html)
- backend-dist.zip (deploy to server)
- hash-password.js (generate password hashes)

---

## ✅ **DEPLOYMENT COMPLETE!**

Your Pool Safe Inc Portal is now live and ready to serve your partners! 🚀

**Remember to**:
1. Change default password after first login
2. Monitor email deliverability
3. Backup database regularly
4. Keep software updated
5. Train your support team

**Congratulations on going live!** 🎉
