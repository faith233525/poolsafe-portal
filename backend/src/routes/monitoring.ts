import express from "express";
import { requireAuthenticated, requireSupport } from "../utils/auth";
import { healthCheck, getMonitoringData, resolveAlert } from "../middleware/monitoring";

const router = express.Router();

// Public health check endpoint (no auth required)
router.get("/health", healthCheck);

// Get comprehensive monitoring dashboard data (requires support role)
router.get("/dashboard", requireAuthenticated, requireSupport, getMonitoringData);

// Resolve a specific alert (requires support role)
router.patch("/alerts/:alertId/resolve", requireAuthenticated, requireSupport, resolveAlert);

export default router;
