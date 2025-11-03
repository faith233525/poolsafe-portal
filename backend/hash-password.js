// Generate bcrypt hash for LounGenie123!!
const bcrypt = require('bcrypt');

const password = 'LounGenie123!!';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  
  console.log('Password:', password);
  console.log('Bcrypt Hash:', hash);
  console.log('\n---SQL to insert support account---\n');
  console.log(`INSERT INTO "User" (email, password, role, "displayName", "createdAt", "updatedAt")`);
  console.log(`VALUES (`);
  console.log(`  'support@poolsafeinc.com',`);
  console.log(`  '${hash}',`);
  console.log(`  'ADMIN',`);
  console.log(`  'Pool Safe Support',`);
  console.log(`  NOW(),`);
  console.log(`  NOW()`);
  console.log(`);`);
  console.log('\n---Or update if exists---\n');
  console.log(`UPDATE "User"`);
  console.log(`SET password = '${hash}', role = 'ADMIN', "updatedAt" = NOW()`);
  console.log(`WHERE email = 'support@poolsafeinc.com';`);
});
