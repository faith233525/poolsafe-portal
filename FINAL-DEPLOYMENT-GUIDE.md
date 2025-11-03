# 🚀 FINAL PRODUCTION DEPLOYMENT GUIDE
## Pool Safe Inc Partner Portal - GO LIVE TODAY

**Status**: ✅ **PRODUCTION READY**  
**Date**: January 2025  
**Version**: 1.0.0

---

## 📋 QUICK START - Deploy in 30 Minutes

### ✅ **Everything is Ready!**
- Frontend built and optimized
- Backend compiled and tested
- Email configuration documented
- Support account credentials generated
- Deployment package created

---

## 🔐 DEFAULT CREDENTIALS

### **Support/Admin Account**
```
Email: support@poolsafeinc.com
Password: LounGenie123!!
Role: ADMIN
```

**IMPORTANT**: Run this SQL on your production database to create the account:

```sql
INSERT INTO "User" (email, password, role, "displayName", "createdAt", "updatedAt")
VALUES (
  'support@poolsafeinc.com',
  '$2b$10$ufXNLHFmX75YgeksumqK9.RROy1VrQMvG8aow3CdpXosqWtZwbx.q',
  'ADMIN',
  'Pool Safe Support',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = '$2b$10$ufXNLHFmX75YgeksumqK9.RROy1VrQMvG8aow3CdpXosqWtZwbx.q',
  role = 'ADMIN';
```

---

## 🎯 AUTHENTICATION - HOW IT WORKS

### **1. Partner Login** (Company-Based)
- **Username**: Company Name (e.g., "Marriott Downtown")
- **Password**: Company's shared password (set by admin)
- **How**: All employees from same company use the same login
- **Endpoint**: `POST /api/auth/login/partner`

**Example**:
```json
{
  "username": "Marriott Downtown",
  "password": "CompanyPassword123"
}
```

### **2. Support/Admin Login**
- **Method**: Email + Password OR Outlook SSO
- **Who**: @poolsafeinc.com email addresses
- **Endpoints**:
  - Local: `POST /api/auth/login`
  - Outlook: `POST /api/auth/login/outlook`

**Example**:
```json
{
  "email": "support@poolsafeinc.com",
  "password": "LounGenie123!!"
}
```

### **3. Contact System** (Reference Only)
- Contacts are NOT used for login
- When partner submits ticket, they provide:
  - First Name
  - Last Name
  - Position/Title
- This creates a Contact record for admin/support reference
- Multiple contacts per company
- One marked as "primary contact"

---

## 📧 EMAIL CONFIGURATION

### **Step 1: Configure Email Service**

For `support@poolsafeinc.com` in your `.env`:

```env
# Outbound Email (SMTP)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=support@poolsafeinc.com
SMTP_PASS=YourEmailPassword123
SMTP_FROM=support@poolsafeinc.com

# Inbound Email (IMAP - for Email-to-Ticket)
SUPPORT_EMAIL_USER=support@poolsafeinc.com
SUPPORT_EMAIL_PASS=YourEmailPassword123
SUPPORT_EMAIL_HOST=outlook.office365.com
SUPPORT_EMAIL_PORT=993
```

### **Step 2: DNS Records for Email Deliverability**

#### **SPF Record** (Prevents Spoofing):
```
Type: TXT
Name: @
Value: v=spf1 include:spf.protection.outlook.com ~all
```

#### **DKIM Records** (Email Signing):
1. Go to Microsoft 365 Admin Center
2. Security & Compliance → Threat Management → Policy → DKIM
3. Enable DKIM for `poolsafeinc.com`
4. Add these CNAME records to DNS:

```
Type: CNAME
Name: selector1._domainkey
Value: selector1-poolsafeinc-com._domainkey.poolsafeinc.onmicrosoft.com

Type: CNAME
Name: selector2._domainkey
Value: selector2-poolsafeinc-com._domainkey.poolsafeinc.onmicrosoft.com
```

#### **DMARC Record** (Email Policy):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:support@poolsafeinc.com; pct=100
```

**What This Does**:
- ✅ Prevents email spoofing
- ✅ Improves deliverability (less spam)
- ✅ Provides email authentication
- ✅ Protects your domain reputation

### **Step 3: Email-to-Ticket Integration**

**How It Works**:
1. Customer sends email to `support@poolsafeinc.com`
2. Backend polls INBOX every 30 seconds
3. Extracts domain from sender email (e.g., @marriott.com)
4. Finds partner company containing that domain
5. Creates ticket automatically
6. Links to correct company

**Domain Matching Logic**:
```
Email: johndoe@marriott.com
Domain: marriott.com
Matches Partner: "Marriott Downtown" (contains "marriott")
Creates ticket for: Marriott Downtown
```

**Fallbacks**:
- If domain doesn't match any company → looks up by user email
- If user not found → assigns to first partner (manual review needed)

**Email Threading**:
- All ticket emails include: `[Ticket #12345]` in subject
- When customer replies, ticket ID extracted
- Reply automatically attached to existing ticket
- No duplicate tickets created

---

## 📦 DEPLOYMENT - cPanel Instructions

### **Step 1: Upload Frontend**

1. Login to cPanel
2. Go to **File Manager**
3. Navigate to `public_html`
4. Upload `frontend-dist.zip` (included in deployment package)
5. Extract all files
6. Verify these files exist:
   - `index.html`
   - `.htaccess`
   - `assets/` folder

### **Step 2: Deploy Backend**

#### **Option A: cPanel Node.js Application**

1. In cPanel, go to **Setup Node.js App**
2. Click **Create Application**
3. Configure:
   - Node.js Version: 18.x or higher
   - Application Mode: Production
   - Application Root: `/home/yourusername/backend`
   - Application URL: `api.yourdomain.com` (or subdomain)
   - Application Startup File: `dist/index.js`
4. Click **Create**
5. Upload backend files to the specified directory
6. Add environment variables in the cPanel Node.js interface
7. Click **Restart** to start the backend

#### **Option B: External VPS/Cloud Server**

If hosting backend separately:

1. SSH into your server
2. Clone or upload backend files
3. Install dependencies: `npm install --production`
4. Build: `npm run build`
5. Create `.env` file with production variables
6. Start with PM2: `pm2 start dist/index.js --name pool-safe-backend`

### **Step 3: Database Setup**

#### **Create PostgreSQL Database** (cPanel):

1. Go to **PostgreSQL Databases**
2. Create new database: `poolsafe_prod`
3. Create user: `poolsafe_user`
4. Set password (save this!)
5. Add user to database with ALL PRIVILEGES
6. Note the connection string:
   ```
   postgresql://poolsafe_user:password@localhost:5432/poolsafe_prod
   ```

#### **Run Migrations**:

```bash
cd backend
DATABASE_URL="postgresql://poolsafe_user:password@localhost:5432/poolsafe_prod" npx prisma migrate deploy
```

#### **Create Support Account**:

Connect to PostgreSQL and run:
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

### **Step 4: Environment Variables**

Create `.env` in backend directory:

```env
# Database
DATABASE_URL=postgresql://poolsafe_user:password@localhost:5432/poolsafe_prod

# JWT Secret (generate random string)
JWT_SECRET=your-super-secret-random-string-here-minimum-32-characters

# Admin Configuration
ADMIN_EMAILS=support@poolsafeinc.com,fabdi@poolsafeinc.com
INTERNAL_EMAIL_DOMAIN=poolsafeinc.com

# Email Service (Outbound)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=support@poolsafeinc.com
SMTP_PASS=YourEmailPassword123
SMTP_FROM=support@poolsafeinc.com

# Email Service (Inbound)
SUPPORT_EMAIL_USER=support@poolsafeinc.com
SUPPORT_EMAIL_PASS=YourEmailPassword123
SUPPORT_EMAIL_HOST=outlook.office365.com
SUPPORT_EMAIL_PORT=993

# Azure AD (for Outlook SSO - Support/Admin)
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
REDIRECT_URI=https://yourdomain.com/api/auth/sso/callback

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# HubSpot (Optional)
HUBSPOT_ACCESS_TOKEN=your-hubspot-token
HUBSPOT_WEBHOOK_SECRET=your-webhook-secret
```

### **Step 5: SSL Certificate**

1. In cPanel, go to **SSL/TLS Status**
2. Click **Run AutoSSL** (for Let's Encrypt)
3. Or manually install SSL certificate
4. Ensure HTTPS is enabled for both frontend and backend

---

## ✅ POST-DEPLOYMENT CHECKLIST

### **1. Test Partner Login**
- [ ] Go to portal login page
- [ ] Select "Partner Login"
- [ ] Login with test company credentials
- [ ] Verify dashboard loads

### **2. Test Support Login**
- [ ] Go to portal login page
- [ ] Select "Support/Admin Login"
- [ ] Login with `support@poolsafeinc.com` / `LounGenie123!!`
- [ ] Verify admin dashboard loads

### **3. Test Ticket Submission**
- [ ] Login as partner
- [ ] Fill out ticket form with all fields:
  - First Name, Last Name, Position
  - Subject, Category, Message
  - Upload file
- [ ] Submit ticket
- [ ] Verify ticket appears in list
- [ ] Check if support receives email notification

### **4. Test Email-to-Ticket**
- [ ] Send email to support@poolsafeinc.com
- [ ] Wait 1 minute
- [ ] Login as support
- [ ] Verify ticket was created automatically
- [ ] Check if company was matched correctly

### **5. Test All Categories**
- [ ] Open ticket form
- [ ] Click category dropdown
- [ ] Verify all 12 categories appear:
  - Call Button
  - Charging
  - Connectivity
  - Screen
  - Locking
  - General Maintenance
  - Monitor
  - Antenna
  - Gateway
  - LoRa
  - General System
  - Other

### **6. Test Email Deliverability**
- [ ] Submit a test ticket
- [ ] Check if email notification arrives
- [ ] Check spam folder if not received
- [ ] Verify email not marked as spam
- [ ] Click links in email (should work)

### **7. Test Support Features**
- [ ] Assign ticket to self
- [ ] Update ticket status
- [ ] Add internal note
- [ ] Upload video
- [ ] View partner map
- [ ] Check calendar events

### **8. Test Admin Features**
- [ ] Create new partner
- [ ] Upload company logo
- [ ] View lock codes
- [ ] Create support staff user
- [ ] Generate analytics report

---

## 🎯 ISSUE CATEGORIES - Complete List

Your portal includes all 12 categories as specified:

### **Unit-Level Issues**:
1. **Call Button** - Call button malfunctions
2. **Charging** - Unit charging problems
3. **Connectivity** - Unit connectivity issues
4. **Screen** - Screen display problems
5. **Locking** - Locking mechanism issues
6. **General Maintenance** - General unit maintenance

### **System-Level Issues**:
7. **Monitor** - System monitor problems
8. **Antenna** - Antenna connectivity
9. **Gateway** - Gateway configuration
10. **LoRa** - LoRa communication issues
11. **General System** - System-wide problems
12. **Other** - Miscellaneous issues

---

## 🔒 SECURITY CHECKLIST

- [ ] HTTPS enabled (SSL certificate)
- [ ] JWT secret is random and secure (32+ characters)
- [ ] Database passwords are strong
- [ ] Email passwords are secure
- [ ] Azure AD credentials are protected
- [ ] `.env` file is not committed to git
- [ ] CORS configured for your domain only
- [ ] Rate limiting enabled
- [ ] Password hashing with bcrypt (10 rounds)
- [ ] Lock codes hidden from partner view
- [ ] Admin emails restricted to @poolsafeinc.com

---

## 📊 MONITORING & MAINTENANCE

### **Health Checks**:
- Backend: `https://api.yourdomain.com/health`
- Frontend: `https://yourdomain.com`

### **Logs**:
- Backend logs: Check cPanel error logs or server logs
- Email logs: Check SMTP/IMAP connection status
- Application logs: Backend console output

### **Backups**:
- Database: Daily PostgreSQL backups
- Uploads: Backup `backend/uploads/` folder
- Configuration: Keep `.env` file backed up securely

### **Email Monitoring**:
- Check email-to-ticket is processing (no stuck emails)
- Monitor spam reports
- Verify SPF/DKIM/DMARC passing (use mail-tester.com)

---

## 🆘 TROUBLESHOOTING

### **Partner can't login**:
1. Verify company exists in database
2. Check `userPass` field is set
3. Username should be exact company name
4. Password is case-sensitive

### **Support can't login**:
1. Verify support account exists (run SQL above)
2. Password is: `LounGenie123!!` (case-sensitive)
3. Check role is 'ADMIN' or 'SUPPORT'
4. Try password reset if needed

### **Emails not sending**:
1. Check SMTP configuration in `.env`
2. Verify email password is correct
3. Test with: `telnet smtp.office365.com 587`
4. Check if port 587 is open on server
5. Verify SPF/DKIM/DMARC records

### **Email-to-ticket not working**:
1. Check IMAP configuration in `.env`
2. Verify email polling is running (backend logs)
3. Check if IMAP port 993 is open
4. Test manual connection to IMAP server
5. Verify support email exists and has IMAP enabled

### **Categories not showing**:
1. Clear browser cache
2. Check frontend build includes latest changes
3. Verify API returns all categories
4. Check browser console for errors

### **Files not uploading**:
1. Check `backend/uploads/` folder exists
2. Verify folder permissions (writable)
3. Check file size limits in backend
4. Verify disk space available

---

## 🎉 YOU'RE LIVE!

**Congratulations!** Your Pool Safe Inc Portal is now production-ready and deployed.

### **What You Have**:
- ✅ Company-based partner authentication
- ✅ Support/Admin login with default account
- ✅ Complete ticket system with all categories
- ✅ Email-to-ticket automation
- ✅ Email deliverability (SPF/DKIM/DMARC)
- ✅ Contact management system
- ✅ File uploads and attachments
- ✅ Admin dashboard with analytics
- ✅ Partner map and calendar
- ✅ Knowledge base and video training
- ✅ Outlook SSO for support staff
- ✅ Lock code management
- ✅ HubSpot integration

### **Support**:
- Login: support@poolsafeinc.com
- Password: LounGenie123!!
- Role: ADMIN (full access)

### **Next Steps**:
1. Change default password after first login
2. Create your partner companies
3. Import existing tickets/data
4. Train support staff
5. Announce launch to partners
6. Monitor email deliverability
7. Collect feedback and iterate

---

## 📞 **Need Help?**

- Check logs for errors
- Review this deployment guide
- Test each feature systematically
- Verify environment variables
- Check DNS records

**Your portal is ready to serve your partners! 🚀**

---

_Last Updated: January 2025_  
_Version: 1.0.0 Production Release_
