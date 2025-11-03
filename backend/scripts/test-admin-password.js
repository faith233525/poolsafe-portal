const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
});

async function testAdminPassword() {
  try {
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@poolsafe.com' }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Password hash:', admin.password?.substring(0, 20) + '...');
    
    // Test password "admin123"
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    
    if (isValid) {
      console.log('✅ Password "admin123" matches!');
    } else {
      console.log('❌ Password "admin123" does NOT match');
      
      // Try other common passwords
      const alternatives = ['Loungenie21', 'LounGenie123!!', 'Admin123!'];
      for (const pwd of alternatives) {
        const valid = await bcrypt.compare(pwd, admin.password);
        if (valid) {
          console.log(`✅ Actual password is: "${pwd}"`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPassword();
