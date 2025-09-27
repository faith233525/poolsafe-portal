import { Router } from "express";
import { prisma } from "../prismaClient";
import { buildPaginated, errorResponse } from "../lib/response";
import {
  requireAuthenticated,
  requireSupport,
  requireAdmin,
  AuthenticatedRequest,
} from "../utils/auth";
import { validateQuery, validateBody } from "../middleware/validate";
import {
  knowledgeBaseListQuerySchema,
  knowledgeBaseCreateSchema,
  knowledgeBaseUpdateSchema,
} from "../validation/schemas";

export const knowledgeBaseRouter = Router();

// Get all knowledge base articles with filtering and search
knowledgeBaseRouter.get(
  "/",
  requireAuthenticated,
  validateQuery(knowledgeBaseListQuerySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        category,
        search,
        published,
        page = 1,
        pageSize = 25,
      } = (req as any).validatedQuery || {};
      const where: any = {};
      if (category) {where.category = category;}
      const role = req.user?.role;
      if (published) {
        if (published === "all") {
          if (role !== "SUPPORT" && role !== "ADMIN") {
            where.isPublished = true;
          }
        } else {
          where.isPublished = published === "true";
        }
      } else {
        if (role !== "SUPPORT" && role !== "ADMIN") {
          where.isPublished = true;
        }
      }
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { content: { contains: search } },
          { searchKeywords: { contains: search } },
        ];
      }
      const [articles, total] = await Promise.all([
        prisma.knowledgeBase.findMany({
          where,
          orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.knowledgeBase.count({ where }),
      ]);
      res.json(buildPaginated(articles, page, pageSize, total));
    } catch (error) {
      console.error("Error fetching knowledge base articles:", error);
      res.status(500).json(errorResponse("Failed to fetch knowledge base articles"));
    }
  },
);

// Get knowledge base article by ID
knowledgeBaseRouter.get("/:id", requireAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const article = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({ error: "Knowledge base article not found" });
    }

    // Increment view count
    await prisma.knowledgeBase.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    res.json({
      ...article,
      viewCount: article.viewCount + 1,
    });
  } catch (error) {
    console.error("Error fetching knowledge base article:", error);
    res.status(500).json({ error: "Failed to fetch knowledge base article" });
  }
});

// Create new knowledge base article (Admin only)
knowledgeBaseRouter.post(
  "/",
  requireSupport,
  validateBody(knowledgeBaseCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { title, content, category, tags, attachments, videos, searchKeywords, isPublished } = (
        req as any
      ).validated;
      const article = await prisma.knowledgeBase.create({
        data: {
          title,
          content,
          category,
          tags: tags ? JSON.stringify(tags) : null,
          attachments: attachments ? JSON.stringify(attachments) : null,
          videos: videos ? JSON.stringify(videos) : null,
          searchKeywords: searchKeywords || null,
          isPublished: isPublished !== undefined ? isPublished : true,
        },
      });
      res.status(201).json(article);
    } catch (error) {
      console.error("Error creating knowledge base article:", error);
      res.status(500).json({ error: "Failed to create knowledge base article" });
    }
  },
);

// Update knowledge base article
knowledgeBaseRouter.put(
  "/:id",
  requireSupport,
  validateBody(knowledgeBaseUpdateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = (req as any).validated;
      if (updateData.tags && Array.isArray(updateData.tags))
        {updateData.tags = JSON.stringify(updateData.tags);}
      if (updateData.attachments && Array.isArray(updateData.attachments))
        {updateData.attachments = JSON.stringify(updateData.attachments);}
      if (updateData.videos && Array.isArray(updateData.videos))
        {updateData.videos = JSON.stringify(updateData.videos);}
      // Only support and admin can update
      if (req.user?.role === "PARTNER") {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Try to update, catch not found error
      let updatedArticle;
      try {
        updatedArticle = await prisma.knowledgeBase.update({ where: { id }, data: updateData });
      } catch (err: any) {
        if (err.code === "P2025") {
          return res.status(500).json({ error: "Failed to update knowledge base article" });
        }
        throw err;
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error updating knowledge base article:", error);
      res.status(500).json({ error: "Failed to update knowledge base article" });
    }
  },
);

// Delete knowledge base article
knowledgeBaseRouter.delete("/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    try {
      await prisma.knowledgeBase.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(500).json({ error: "Failed to delete knowledge base article" });
      }
      throw err;
    }
    res.json({ message: "Knowledge base article deleted successfully" });
  } catch (error) {
    console.error("Error deleting knowledge base article:", error);
    res.status(500).json({ error: "Failed to delete knowledge base article" });
  }
});

// Get articles by category
knowledgeBaseRouter.get(
  "/category/:category",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { category } = req.params;
      const { published = "true" } = req.query;

      const articles = await prisma.knowledgeBase.findMany({
        where: {
          category,
          isPublished: published === "true",
        },
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      });

      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles by category:", error);
      res.status(500).json({ error: "Failed to fetch articles by category" });
    }
  },
);

// Search articles
knowledgeBaseRouter.get(
  "/search/:query",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { query } = req.params;
      const { category, published = "true" } = req.query;

      const orClauses: any[] = [
        { title: { contains: query } },
        { searchKeywords: { contains: query } },
      ];
      if ((query || "").length >= 5) {
        orClauses.push({ content: { contains: query } });
      }

      const where: any = {
        isPublished: published === "true",
        OR: orClauses,
      };

      if (category) {
        where.category = category as string;
      }

      const articles = await prisma.knowledgeBase.findMany({
        where,
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      });

      res.json(articles);
    } catch (error) {
      console.error("Error searching knowledge base:", error);
      res.status(500).json({ error: "Failed to search knowledge base" });
    }
  },
);

// Rate article
knowledgeBaseRouter.post(
  "/:id/rate",
  requireAuthenticated,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { rating } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          error: "Rating must be between 1 and 5",
        });
      }

      const article = await prisma.knowledgeBase.findUnique({
        where: { id },
      });

      if (!article) {
        return res.status(404).json({ error: "Knowledge base article not found" });
      }

      // Simple average rating calculation
      // In a real app, you'd store individual ratings in a separate table
      const currentRating = article.rating || 0;
      const newRating = currentRating === 0 ? rating : (currentRating + rating) / 2;

      const updatedArticle = await prisma.knowledgeBase.update({
        where: { id },
        data: {
          rating: newRating,
        },
      });

      res.json({
        message: "Rating submitted successfully",
        newRating: updatedArticle.rating,
      });
    } catch (error) {
      console.error("Error rating article:", error);
      res.status(500).json({ error: "Failed to rate article" });
    }
  },
);

// Get knowledge base statistics
knowledgeBaseRouter.get(
  "/stats/summary",
  requireSupport,
  async (req: AuthenticatedRequest, res) => {
    try {
      const [totalArticles, publishedArticles, categoryStats, topArticles, averageRating] =
        await Promise.all([
          // Total articles
          prisma.knowledgeBase.count(),

          // Published articles
          prisma.knowledgeBase.count({
            where: { isPublished: true },
          }),

          // By category
          prisma.knowledgeBase.groupBy({
            by: ["category"],
            _count: { category: true },
          }),

          // Top viewed articles
          prisma.knowledgeBase.findMany({
            where: { isPublished: true },
            orderBy: { viewCount: "desc" },
            take: 10,
            select: {
              id: true,
              title: true,
              category: true,
              viewCount: true,
              rating: true,
            },
          }),

          // Average rating
          prisma.knowledgeBase.aggregate({
            where: {
              isPublished: true,
              rating: { not: null },
            },
            _avg: { rating: true },
          }),
        ]);

      res.json({
        totalArticles,
        publishedArticles,
        byCategory: categoryStats,
        topArticles,
        averageRating: averageRating._avg.rating,
      });
    } catch (error) {
      console.error("Error fetching knowledge base stats:", error);
      res.status(500).json({ error: "Failed to fetch knowledge base statistics" });
    }
  },
);
