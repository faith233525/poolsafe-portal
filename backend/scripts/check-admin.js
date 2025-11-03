const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
});

async function checkAdmin() {
  try {
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@poolsafe.com' }
    });
    
    if (admin) {
      console.log('✅ Admin user found in dev.db');
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   Has password:', !!admin.password);
    } else {
      console.log('❌ Admin user NOT found in dev.db');
    }
    
    const support = await prisma.user.findFirst({
      where: { email: 'support@poolsafe.com' }
    });
    
    if (support) {
      console.log('✅ Support user found in dev.db');
      console.log('   Email:', support.email);
      console.log('   Role:', support.role);
    } else {
      console.log('❌ Support user NOT found in dev.db');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
