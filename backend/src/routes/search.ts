import { Router } from "express";
import { prisma } from "../prismaClient";
import { authenticateToken, requireAuthenticated, AuthenticatedRequest } from "../utils/auth";
import { validateQuery } from "../middleware/validate";
import { unifiedSearchQuerySchema } from "../validation/schemas";

export const searchRouter = Router();

searchRouter.get(
  "/",
  authenticateToken,
  requireAuthenticated,
  validateQuery(unifiedSearchQuerySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        q,
        includeTickets = "true",
        includeKnowledge = "true",
        ticketsPage = 1,
        ticketsPageSize = 10,
        kbPage = 1,
        kbPageSize = 10,
      } = (req as any).validatedQuery;

      const doTickets = includeTickets === "true";
      const doKB = includeKnowledge === "true";

      const ticketWhere: any = {
        OR: [
          { subject: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { createdByName: { contains: q, mode: "insensitive" } },
        ],
      };
      if (req.user!.role === "PARTNER") {
        ticketWhere.partnerId = req.user!.partnerId;
      }

      const kbWhere: any = {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { searchKeywords: { contains: q, mode: "insensitive" } },
        ],
      };

      const promises: any[] = [];
      if (doTickets) {
        promises.push(
          prisma.ticket.findMany({
            where: ticketWhere,
            select: {
              id: true,
              subject: true,
              description: true,
              priority: true,
              status: true,
              createdAt: true,
              partnerId: true,
            },
            orderBy: { createdAt: "desc" },
            skip: (ticketsPage - 1) * ticketsPageSize,
            take: ticketsPageSize,
          }),
          prisma.ticket.count({ where: ticketWhere }),
        );
      }
      if (doKB) {
        promises.push(
          prisma.knowledgeBase.findMany({
            where: kbWhere,
            select: {
              id: true,
              title: true,
              category: true,
              viewCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            skip: (kbPage - 1) * kbPageSize,
            take: kbPageSize,
          }),
          prisma.knowledgeBase.count({ where: kbWhere }),
        );
      }

      const results = await Promise.all(promises);
      let idx = 0;
      let ticketsBlock = null;
      let kbBlock = null;
      if (doTickets) {
        const data = results[idx++];
        const total = results[idx++];
        ticketsBlock = {
          page: ticketsPage,
          pageSize: ticketsPageSize,
          total,
          totalPages: Math.ceil(total / ticketsPageSize),
          data,
        };
      }
      if (doKB) {
        const data = results[idx++];
        const total = results[idx++];
        kbBlock = {
          page: kbPage,
          pageSize: kbPageSize,
          total,
          totalPages: Math.ceil(total / kbPageSize),
          data,
        };
      }

      res.json({ query: q, tickets: ticketsBlock, knowledgeBase: kbBlock });
    } catch (e) {
      console.error("Unified search failed", e);
      res.status(500).json({ error: "search_failed" });
    }
  },
);
