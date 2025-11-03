-- SQL Script to Create Default Support Account
-- Run this on your production PostgreSQL database

-- First, create the password hash for: LounGenie123!!
-- You'll need to use bcrypt to generate this hash
-- The hash below is a placeholder - generate it using your backend's hashPassword function

-- Create or update the support account
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
  '$2b$10$placeholder_hash_here', -- REPLACE WITH ACTUAL BCRYPT HASH
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

-- Verify the account was created
SELECT id, email, role, "displayName", "createdAt"
FROM "User"
WHERE email = 'support@poolsafeinc.com';
