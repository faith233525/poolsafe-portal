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
          { subject: { contains: q } },
          { description: { contains: q } },
          { createdByName: { contains: q } },
        ],
      };
      if (req.user!.role === "PARTNER") {
        ticketWhere.partnerId = req.user!.partnerId;
      }

      const kbWhere: any = {
        isPublished: true,
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { searchKeywords: { contains: q } },
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
      let ticketsBlock: any | undefined;
      let kbBlock: any | undefined;
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

      // Build response object omitting undefined sections (so property is absent)
      const response: any = { query: q };
      if (typeof ticketsBlock !== "undefined") {
        response.tickets = ticketsBlock;
      }
      if (typeof kbBlock !== "undefined") {
        response.knowledgeBase = kbBlock;
      }
      res.json(response);
    } catch (e) {
      console.error("Unified search failed", e);
      res.status(500).json({ error: "search_failed" });
    }
  },
);
