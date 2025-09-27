import { PrismaClient } from '@prisma/client';
import { logger, logHelpers } from '../lib/logger';

// Optimized Prisma queries with performance monitoring
export class OptimizedQueries {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Optimized ticket queries with pagination and selective fields
  async getTicketsPaginated(
    partnerId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    priority?: string
  ) {
    const startTime = Date.now();
    
    try {
      const skip = (page - 1) * limit;
      const where: any = { partnerId };
      
      if (status) where.status = status;
      if (priority) where.priority = priority;

      const [tickets, total] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            partner: {
              select: {
                id: true,
                companyName: true
              }
            },
            _count: {
              select: {
                attachments: true
              }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        this.prisma.ticket.count({ where })
      ]);

      const executionTime = Date.now() - startTime;
      
      logHelpers.logDatabase(
        'SELECT_PAGINATED',
        'ticket',
        undefined,
        partnerId,
        executionTime
      );

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Error in getTicketsPaginated', { error, executionTime, partnerId });
      throw error;
    }
  }

  // Optimized partner lookup with caching consideration
  async getPartnerWithStats(partnerId: string) {
    const startTime = Date.now();
    
    try {
      const partner = await this.prisma.partner.findUnique({
        where: { id: partnerId },
        include: {
          _count: {
            select: {
              tickets: true,
              users: true,
              serviceRecords: true
            }
          },
          tickets: {
            select: {
              status: true,
              priority: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5 // Only recent tickets for dashboard
          }
        }
      });

      const executionTime = Date.now() - startTime;
      
      logHelpers.logDatabase(
        'SELECT_WITH_STATS',
        'partner',
        partnerId,
        undefined,
        executionTime
      );

      return partner;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Error in getPartnerWithStats', { error, executionTime, partnerId });
      throw error;
    }
  }

  // Batch operations for better performance
  async createMultipleNotifications(notifications: Array<{
    userId?: string;
    recipientEmail?: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string;
    relatedType?: string;
  }>) {
    const startTime = Date.now();
    
    try {
      const result = await this.prisma.notification.createMany({
        data: notifications.map(notification => ({
          ...notification,
          createdAt: new Date()
        }))
      });

      const executionTime = Date.now() - startTime;
      
      logHelpers.logDatabase(
        'BATCH_INSERT',
        'notification',
        undefined,
        undefined,
        executionTime
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Error in createMultipleNotifications', { error, executionTime });
      throw error;
    }
  }

  // Optimized search with full-text search capabilities
  async searchTickets(
    searchTerm: string,
    partnerId?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const startTime = Date.now();
    
    try {
      const skip = (page - 1) * limit;
      const where: any = {
        OR: [
          { subject: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { partner: { companyName: { contains: searchTerm, mode: 'insensitive' } } }
        ]
      };

      if (partnerId) {
        where.partnerId = partnerId;
      }

      const [tickets, total] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            partner: {
              select: {
                id: true,
                companyName: true
              }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        this.prisma.ticket.count({ where })
      ]);

      const executionTime = Date.now() - startTime;
      
      logHelpers.logDatabase(
        'SEARCH',
        'ticket',
        undefined,
        partnerId,
        executionTime
      );

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Error in searchTickets', { error, executionTime, searchTerm, partnerId });
      throw error;
    }
  }

  // Bulk status updates for efficiency
  async bulkUpdateTicketStatus(
    ticketIds: string[],
    status: string,
    partnerId: string
  ) {
    const startTime = Date.now();
    
    try {
      const result = await this.prisma.ticket.updateMany({
        where: {
          id: { in: ticketIds },
          partnerId // Ensure user can only update their partner's tickets
        },
        data: {
          status,
          updatedAt: new Date()
        }
      });

      const executionTime = Date.now() - startTime;
      
      logHelpers.logDatabase(
        'BULK_UPDATE',
        'ticket',
        `${ticketIds.length} tickets`,
        partnerId,
        executionTime
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Error in bulkUpdateTicketStatus', { error, executionTime, ticketIds, partnerId });
      throw error;
    }
  }

  // Dashboard summary with optimized aggregations
  async getDashboardSummary(partnerId: string) {
    const startTime = Date.now();
    
    try {
      const [
        ticketStats,
        recentTickets,
        serviceRecordCount,
        upcomingEvents
      ] = await Promise.all([
        // Ticket statistics
        this.prisma.ticket.groupBy({
          by: ['status'],
          where: { partner: { id: partnerId } },
          _count: true
        }),
        
        // Recent tickets
        this.prisma.ticket.findMany({
          where: { partner: { id: partnerId } },
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        
        // Service record count
        this.prisma.serviceRecord.count({
          where: { partnerId }
        }),
        
        // Upcoming calendar events
        this.prisma.calendarEvent.findMany({
          where: {
            partnerId,
            startDate: { gte: new Date() }
          },
          select: {
            id: true,
            title: true,
            startDate: true,
            eventType: true
          },
          orderBy: { startDate: 'asc' },
          take: 5
        })
      ]);

      const executionTime = Date.now() - startTime;
      
      logHelpers.logDatabase(
        'DASHBOARD_SUMMARY',
        'multiple',
        partnerId,
        undefined,
        executionTime
      );

      return {
        ticketStats,
        recentTickets,
        serviceRecordCount,
        upcomingEvents
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Error in getDashboardSummary', { error, executionTime, partnerId });
      throw error;
    }
  }
}

// Memory cache for frequently accessed data
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
    
    // Clean up expired entries periodically
    if (this.cache.size % 100 === 0) {
      this.cleanup();
    }
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export cache instance
export const memoryCache = new MemoryCache();

// Cache middleware for Express
export const cacheMiddleware = (keyPrefix: string, ttl: number = 5 * 60 * 1000) => {
  return (req: any, res: any, next: any) => {
    const key = `${keyPrefix}:${req.method}:${req.originalUrl}:${req.user?.userId || 'anonymous'}`;
    const cached = memoryCache.get(key);
    
    if (cached) {
      logger.debug('Cache hit', { key, url: req.originalUrl });
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        memoryCache.set(key, data, ttl);
        logger.debug('Cache set', { key, url: req.originalUrl });
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Database connection pooling configuration
export const optimizePrismaConnection = (prisma: PrismaClient) => {
  // Connection event logging
  prisma.$on('query' as never, (e: any) => {
    if (e.duration > 1000) { // Log slow queries
      logger.warn('Slow query detected', {
        query: e.query,
        params: e.params,
        duration: e.duration,
        target: e.target
      });
    }
  });

  // Graceful shutdown (optional). Some local tools send signals; allow disabling via env
  const ENABLE_SHUTDOWN = (process.env.ENABLE_SHUTDOWN ?? 'true').toLowerCase() !== 'false';
  if (ENABLE_SHUTDOWN) {
    process.on('SIGINT', async () => {
      logger.info('Disconnecting from database...');
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Disconnecting from database...');
      await prisma.$disconnect();
      process.exit(0);
    });
  } else {
    logger.info('Graceful shutdown disabled (ENABLE_SHUTDOWN=false)');
  }
};