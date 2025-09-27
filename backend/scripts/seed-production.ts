import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../src/lib/logger';

const prisma = new PrismaClient();

// Sample data for seeding
const sampleData = {
  partners: [
    {
      id: 'partner-1',
      companyName: 'Luxury Resort & Spa',
      userPass: 'secure123',
      managementCompany: 'Premium Hospitality Group',
      streetAddress: '123 Paradise Drive',
      city: 'Miami Beach',
      state: 'FL',
      zip: '33139',
      country: 'USA',
      numberOfLoungeUnits: 50,
      topColour: 'Blue',
      lock: 'Digital',
      masterCode: 'MASTER001',
      subMasterCode: 'SUB001',
      lockPart: 'LP001',
      key: 'KEY001',
      latitude: 25.7617,
      longitude: -80.1918
    },
    {
      id: 'partner-2',
      companyName: 'Downtown Business Center',
      userPass: 'business456',
      managementCompany: 'Corporate Management LLC',
      streetAddress: '456 Business Boulevard',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
      numberOfLoungeUnits: 25,
      topColour: 'Gray',
      lock: 'Mechanical',
      masterCode: 'MASTER002',
      subMasterCode: 'SUB002',
      lockPart: 'LP002',
      key: 'KEY002',
      latitude: 40.7128,
      longitude: -74.0060
    },
    {
      id: 'partner-3',
      companyName: 'Beachside Hotel & Casino',
      userPass: 'casino789',
      managementCompany: 'Entertainment Ventures Inc',
      streetAddress: '789 Ocean View Avenue',
      city: 'Las Vegas',
      state: 'NV',
      zip: '89101',
      country: 'USA',
      numberOfLoungeUnits: 75,
      topColour: 'Gold',
      lock: 'Smart Lock',
      masterCode: 'MASTER003',
      subMasterCode: 'SUB003',
      lockPart: 'LP003',
      key: 'KEY003',
      latitude: 36.1699,
      longitude: -115.1398
    }
  ],
  contacts: [
    {
      partnerId: 'partner-1',
      firstName: 'John',
      lastName: 'Smith',
      title: 'General Manager',
      email: 'john.smith@luxuryresort.com',
      phone: '+1-305-555-0101',
      isPrimary: true,
      notes: 'Primary contact for all resort operations'
    },
    {
      partnerId: 'partner-1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      title: 'Operations Manager',
      email: 'sarah.johnson@luxuryresort.com',
      phone: '+1-305-555-0102',
      isPrimary: false,
      notes: 'Handles day-to-day operations'
    },
    {
      partnerId: 'partner-2',
      firstName: 'Michael',
      lastName: 'Brown',
      title: 'Facility Manager',
      email: 'michael.brown@businesscenter.com',
      phone: '+1-212-555-0201',
      isPrimary: true,
      notes: 'Main point of contact for facility issues'
    },
    {
      partnerId: 'partner-3',
      firstName: 'Lisa',
      lastName: 'Davis',
      title: 'IT Director',
      email: 'lisa.davis@beachsidecasino.com',
      phone: '+1-702-555-0301',
      isPrimary: true,
      notes: 'Technology and systems coordinator'
    }
  ],
  users: [
    {
      email: 'admin@poolsafe.com',
      password: 'Admin123!',
      displayName: 'System Administrator',
      role: 'ADMIN'
    },
    {
      email: 'support@poolsafe.com',
      password: 'Support123!',
      displayName: 'Support Team',
      role: 'SUPPORT'
    },
    {
      email: 'john.smith@luxuryresort.com',
      password: 'Partner123!',
      displayName: 'John Smith',
      role: 'PARTNER',
      partnerId: 'partner-1'
    },
    {
      email: 'michael.brown@businesscenter.com',
      password: 'Partner456!',
      displayName: 'Michael Brown',
      role: 'PARTNER',
      partnerId: 'partner-2'
    },
    {
      email: 'lisa.davis@beachsidecasino.com',
      password: 'Partner789!',
      displayName: 'Lisa Davis',
      role: 'PARTNER',
      partnerId: 'partner-3'
    }
  ],
  knowledgeBase: [
    {
      title: 'How to Reset Your Pool Safe Lock',
      content: 'Follow these steps to reset your pool safe lock: 1. Locate the reset button on the back of the unit. 2. Press and hold for 10 seconds. 3. Enter new master code. 4. Confirm by pressing # key.',
      category: 'Lock Management',
      tags: 'lock,reset,master code,troubleshooting',
      searchKeywords: 'reset lock master code troubleshoot',
      viewCount: 0,
      rating: 4.5,
      isPublished: true
    },
    {
      title: 'Battery Replacement Guide',
      content: 'When your pool safe shows low battery warning: 1. Remove the battery compartment cover. 2. Replace with 4 AA alkaline batteries. 3. Ensure proper polarity. 4. Test lock operation.',
      category: 'Maintenance',
      tags: 'battery,replacement,maintenance,power',
      searchKeywords: 'battery replace maintenance power low',
      viewCount: 0,
      rating: 4.8,
      isPublished: true
    },
    {
      title: 'Troubleshooting Common Issues',
      content: 'Common issues and solutions: Lock not responding - check batteries. Code not working - verify master code. Unit not opening - check for sand or debris. For persistent issues, contact support.',
      category: 'Troubleshooting',
      tags: 'troubleshooting,common issues,support',
      searchKeywords: 'troubleshoot problems issues help support',
      viewCount: 0,
      rating: 4.3,
      isPublished: true
    },
    {
      title: 'Setting Up Guest Access Codes',
      content: 'To set up guest access codes: 1. Enter master code + * key. 2. Enter programming mode. 3. Set guest code (4-8 digits). 4. Set time restrictions if needed. 5. Save settings.',
      category: 'Access Control',
      tags: 'guest codes,access,programming,security',
      searchKeywords: 'guest access codes programming security',
      viewCount: 0,
      rating: 4.6,
      isPublished: true
    },
    {
      title: 'Maintenance Schedule Recommendations',
      content: 'Recommended maintenance schedule: Monthly - clean exterior, check battery level. Quarterly - lubricate hinges, test all codes. Annually - professional inspection, seal replacement if needed.',
      category: 'Maintenance',
      tags: 'maintenance,schedule,cleaning,inspection',
      searchKeywords: 'maintenance schedule cleaning inspection yearly',
      viewCount: 0,
      rating: 4.4,
      isPublished: true
    }
  ],
  tickets: [
    {
      partnerId: 'partner-1',
      subject: 'Lock not responding to master code',
      category: 'Lock Issues',
      description: 'The pool safe lock is not responding when we enter the master code. The display shows numbers but nothing happens when we press the open button.',
      priority: 'HIGH',
      status: 'OPEN',
      contactPreference: 'EMAIL',
      recurringIssue: false,
      unitsAffected: 3,
      severity: 3,
      dateOfOccurrence: new Date('2024-01-15')
    },
    {
      partnerId: 'partner-2',
      subject: 'Battery replacement needed',
      category: 'Maintenance',
      description: 'Low battery warning is showing on multiple units. Need to schedule battery replacement service.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      contactPreference: 'PHONE',
      recurringIssue: false,
      unitsAffected: 8,
      severity: 2,
      dateOfOccurrence: new Date('2024-01-20')
    },
    {
      partnerId: 'partner-3',
      subject: 'Guest code not working',
      category: 'Access Control',
      description: 'Guests are reporting that their access codes are not working for units 101-105. They receive error messages when trying to access their belongings.',
      priority: 'HIGH',
      status: 'ESCALATED',
      contactPreference: 'EMAIL',
      recurringIssue: true,
      unitsAffected: 5,
      severity: 4,
      dateOfOccurrence: new Date('2024-01-22'),
      escalated: true
    }
  ],
  serviceRecords: [
    {
      partnerId: 'partner-1',
      serviceType: 'Battery Replacement',
      description: 'Replaced batteries in units 1-10',
      notes: 'All units tested and working properly',
      scheduledDate: new Date('2024-01-10'),
      completedDate: new Date('2024-01-10'),
      status: 'COMPLETED'
    },
    {
      partnerId: 'partner-2',
      serviceType: 'Lock Calibration',
      description: 'Recalibrated lock mechanisms in lobby units',
      notes: 'Adjusted sensitivity settings for better response',
      scheduledDate: new Date('2024-01-18'),
      completedDate: new Date('2024-01-18'),
      status: 'COMPLETED'
    },
    {
      partnerId: 'partner-3',
      serviceType: 'System Upgrade',
      description: 'Firmware update for all pool safe units',
      notes: 'Updated to version 2.1.3 with improved security features',
      scheduledDate: new Date('2024-01-25'),
      status: 'SCHEDULED'
    }
  ],
  calendarEvents: [
    {
      partnerId: 'partner-1',
      title: 'Monthly Maintenance Check',
      description: 'Routine maintenance inspection of all pool safe units',
      eventType: 'MAINTENANCE',
      startDate: new Date('2024-02-01T09:00:00'),
      endDate: new Date('2024-02-01T17:00:00'),
      isRecurring: true,
      recurrenceRule: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1',
      reminderMinutes: 60
    },
    {
      partnerId: 'partner-2',
      title: 'System Training Session',
      description: 'Staff training on new pool safe features',
      eventType: 'TRAINING',
      startDate: new Date('2024-02-05T14:00:00'),
      endDate: new Date('2024-02-05T16:00:00'),
      isRecurring: false,
      reminderMinutes: 30
    },
    {
      partnerId: 'partner-3',
      title: 'Quarterly Business Review',
      description: 'Review of pool safe performance and usage statistics',
      eventType: 'MEETING',
      startDate: new Date('2024-02-15T10:00:00'),
      endDate: new Date('2024-02-15T11:30:00'),
      isRecurring: true,
      recurrenceRule: 'RRULE:FREQ=MONTHLY;INTERVAL=3',
      reminderMinutes: 120
    }
  ]
};

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seedDatabase() {
  try {
    logger.info('Starting database seeding process...');

    // Clear existing data (in reverse order of dependencies)
    logger.info('Clearing existing data...');
    await prisma.calendarEvent.deleteMany();
    await prisma.serviceRecord.deleteMany();
    await prisma.ticketAttachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.knowledgeBase.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.errorLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.partner.deleteMany();

    // Seed Partners
    logger.info('Seeding partners...');
    for (const partner of sampleData.partners) {
      await prisma.partner.create({
        data: {
          ...partner,
          userPass: await hashPassword(partner.userPass)
        }
      });
    }

    // Seed Contacts
    logger.info('Seeding contacts...');
    for (const contact of sampleData.contacts) {
      await prisma.contact.create({ data: contact });
    }

    // Seed Users
    logger.info('Seeding users...');
    for (const user of sampleData.users) {
      await prisma.user.create({
        data: {
          ...user,
          password: await hashPassword(user.password)
        }
      });
    }

    // Seed Knowledge Base
    logger.info('Seeding knowledge base...');
    for (const kb of sampleData.knowledgeBase) {
      await prisma.knowledgeBase.create({ data: kb });
    }

    // Get contact IDs for ticket seeding
    const contacts = await prisma.contact.findMany();
    
    // Seed Tickets
    logger.info('Seeding tickets...');
    for (let i = 0; i < sampleData.tickets.length; i++) {
      const ticket = sampleData.tickets[i];
      const contact = contacts.find(c => c.partnerId === ticket.partnerId);
      
      await prisma.ticket.create({
        data: {
          ...ticket,
          contactId: contact?.id
        }
      });
    }

    // Get user IDs for service records
    const users = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    const adminUser = users[0];

    // Seed Service Records
    logger.info('Seeding service records...');
    for (const record of sampleData.serviceRecords) {
      await prisma.serviceRecord.create({
        data: {
          ...record,
          assignedToId: adminUser?.id
        }
      });
    }

    // Seed Calendar Events
    logger.info('Seeding calendar events...');
    for (const event of sampleData.calendarEvents) {
      await prisma.calendarEvent.create({
        data: {
          ...event,
          createdById: adminUser?.id
        }
      });
    }

    // Create sample notifications
    logger.info('Creating sample notifications...');
    const partnerUsers = await prisma.user.findMany({ where: { role: 'PARTNER' } });
    
    for (const user of partnerUsers) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to Pool Safe Portal',
          message: 'Welcome to the Pool Safe Inc Partner Portal. You can now manage your pool safe units, view service history, and submit support tickets.',
          type: 'WELCOME',
          relatedType: 'SYSTEM',
          isRead: false
        }
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Scheduled Maintenance Reminder',
          message: 'Your monthly maintenance check is scheduled for next week. Please ensure all units are accessible.',
          type: 'REMINDER',
          relatedType: 'MAINTENANCE',
          isRead: false
        }
      });
    }

    // Create some sample error logs for monitoring
    logger.info('Creating sample error logs...');
    await prisma.errorLog.create({
      data: {
        errorId: 'ERR001',
        message: 'Database connection timeout',
        stack: 'Error: Connection timeout\n    at Database.connect (database.js:45)',
        context: JSON.stringify({ component: 'database', operation: 'connect' }),
        count: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        severity: 'medium',
        type: 'database'
      }
    });

    // Get final counts
    const counts = {
      partners: await prisma.partner.count(),
      contacts: await prisma.contact.count(),
      users: await prisma.user.count(),
      tickets: await prisma.ticket.count(),
      serviceRecords: await prisma.serviceRecord.count(),
      calendarEvents: await prisma.calendarEvent.count(),
      knowledgeBase: await prisma.knowledgeBase.count(),
      notifications: await prisma.notification.count(),
      errorLogs: await prisma.errorLog.count()
    };

    logger.info('Database seeding completed successfully!');
    logger.info('Seeded data counts:', counts);

    return counts;

  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then((counts) => {
      console.log('✅ Database seeded successfully!');
      console.log('📊 Final counts:', counts);
      console.log('\n🔐 Default login credentials:');
      console.log('Admin: admin@poolsafe.com / Admin123!');
      console.log('Support: support@poolsafe.com / Support123!');
      console.log('Partner (Luxury Resort): john.smith@luxuryresort.com / Partner123!');
      console.log('Partner (Business Center): michael.brown@businesscenter.com / Partner456!');
      console.log('Partner (Beachside Casino): lisa.davis@beachsidecasino.com / Partner789!');
    })
    .catch((error) => {
      console.error('❌ Failed to seed database:', error);
      process.exit(1);
    });
}

export { seedDatabase };