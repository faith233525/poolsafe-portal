# 🔐 Create Default Support Account

## Account Details
- **Email**: support@poolsafeinc.com
- **Password**: LounGenie123!!
- **Role**: ADMIN

---

## Method 1: Using Backend API (Recommended)

### Step 1: Start Your Backend Server
```bash
cd backend
npm run dev
```

### Step 2: Create Account via API
```bash
# Using curl (Git Bash or WSL)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "support@poolsafeinc.com",
    "password": "LounGenie123!!",
    "displayName": "Pool Safe Support"
  }'

# Or using PowerShell
$body = @{
    email = "support@poolsafeinc.com"
    password = "LounGenie123!!"
    displayName = "Pool Safe Support"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Step 3: Update Role to ADMIN
After registering, update the role manually in your database:
```sql
UPDATE "User" 
SET role = 'ADMIN' 
WHERE email = 'support@poolsafeinc.com';
```

---

## Method 2: Using Database Directly

### For PostgreSQL (Production):

1. **Generate Password Hash**:
   First, run this Node.js script to generate the bcrypt hash:
   
   ```javascript
   // Save as hash-password.js
   const bcrypt = require('bcrypt');
   
   async function hashPassword(password) {
     const hash = await bcrypt.hash(password, 10);
     console.log('Password hash:', hash);
     console.log('\nCopy this hash and use it in the SQL script below.');
   }
   
   hashPassword('LounGenie123!!');
   ```
   
   Run it:
   ```bash
   cd backend
   node hash-password.js
   ```

2. **Run SQL Script**:
   ```sql
   INSERT INTO "User" (
     id,
     email,
     password,
     role,
     "displayName",
     "createdAt",
     "updatedAt"
   )
   VALUES (
     gen_random_uuid(),
     'support@poolsafeinc.com',
     'YOUR_BCRYPT_HASH_HERE', -- Paste the hash from step 1
     'ADMIN',
     'Pool Safe Support',
     NOW(),
     NOW()
   )
   ON CONFLICT (email)
   DO UPDATE SET
     password = EXCLUDED.password,
     role = 'ADMIN',
     "displayName" = 'Pool Safe Support',
     "updatedAt" = NOW();
   ```

---

## Method 3: Using Prisma Studio

1. **Start Prisma Studio**:
   ```bash
   cd backend
   npx prisma studio
   ```

2. **Create User Record**:
   - Click on "User" table
   - Click "+ Add record"
   - Fill in:
     - email: `support@poolsafeinc.com`
     - password: `(generate hash using Method 2, step 1)`
     - role: `ADMIN`
     - displayName: `Pool Safe Support`
   - Click "Save 1 change"

---

## Method 4: Manual Password Hash Generator

Create a quick script to generate the hash:

```javascript
// hash-password.js
import bcrypt from 'bcrypt';

const password = 'LounGenie123!!';
const hash = await bcrypt.hash(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nInsert SQL:');
console.log(`
INSERT INTO "User" (email, password, role, "displayName", "createdAt", "updatedAt")
VALUES (
  'support@poolsafeinc.com',
  '${hash}',
  'ADMIN',
  'Pool Safe Support',
  NOW(),
  NOW()
);
`);
```

Run it:
```bash
cd backend
node hash-password.js
```

Copy the generated SQL and run it in your PostgreSQL database.

---

## Verification

After creating the account, test the login:

### Via Frontend:
1. Go to your portal login page
2. Select "Support/Admin Login"
3. Enter:
   - Email: `support@poolsafeinc.com`
   - Password: `LounGenie123!!`
4. Should redirect to admin dashboard

### Via API:
```bash
# curl
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "support@poolsafeinc.com",
    "password": "LounGenie123!!"
  }'

# PowerShell
$body = @{
    email = "support@poolsafeinc.com"
    password = "LounGenie123!!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

Should return a JWT token and user object with role = "ADMIN".

---

## Important Notes

1. **Change Password After First Login** (Security Best Practice):
   - Login with the default password
   - Go to Profile/Settings
   - Change to a secure password
   - Update your documentation

2. **For Production**:
   - Use a strong, unique password
   - Don't commit passwords to version control
   - Use environment variables for sensitive data
   - Enable 2FA if available

3. **Email Configuration**:
   - Make sure `support@poolsafeinc.com` is a real email account
   - Configure SMTP/IMAP for email-to-ticket functionality
   - Add SPF, DKIM, and DMARC records (see PRODUCTION-READY.md)

---

## Troubleshooting

**"Email already exists" error**:
- The account already exists
- Try logging in with the existing password
- Or update the password using the SQL UPDATE statement

**"Database connection error"**:
- Make sure PostgreSQL is running
- Check your `DATABASE_URL` in `.env`
- Verify the database exists

**"Invalid credentials" after creating account**:
- Verify the password hash was generated correctly
- Make sure you're using bcrypt with 10 salt rounds
- Check the role is set to 'ADMIN' or 'SUPPORT'

---

## ✅ Once Account is Created

You can now:
- ✅ Login as support@poolsafeinc.com
- ✅ Access admin dashboard
- ✅ Manage all tickets
- ✅ Create partners and users
- ✅ View lock codes
- ✅ Upload videos
- ✅ Configure system settings

**Your default support account is ready! 🎉**
