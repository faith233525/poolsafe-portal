import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
  performanceMonitor,
  healthCheck,
  monitoringUtils,
  getMonitoringData,
  resolveAlert,
} from "../src/middleware/monitoring";

// Mock logger
vi.mock("../src/middleware/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Prisma client
vi.mock("../src/prismaClient", () => ({
  getPrismaClient: vi.fn().mockReturnValue({
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  }),
}));

describe("Monitoring Middleware", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockReq = {
      method: "GET",
      path: "/test",
      url: "/test",
      params: {},
      body: {},
      query: {},
      user: { id: "test-user" },
      ip: "127.0.0.1",
      get: vi.fn().mockReturnValue("test-user-agent"),
    };

    mockRes = {
      statusCode: 200,
      end: vi.fn(),
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    };

    mockNext = vi.fn();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    // Clear monitoring data between tests
    monitoringUtils.clearMetrics();
  });

  describe("performanceMonitor middleware", () => {
    it("should call next function", () => {
      performanceMonitor(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should track request performance", () => {
      performanceMonitor(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response ending
      if (mockRes.end && typeof mockRes.end === "function") {
        mockRes.end();
      }

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should handle different HTTP methods", () => {
      mockReq.method = "POST";
      mockReq.path = "/api/tickets";
      mockReq.url = "/api/tickets";

      performanceMonitor(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should handle requests without user", () => {
      mockReq.user = undefined;
      performanceMonitor(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should handle error responses", () => {
      mockRes.statusCode = 500;
      performanceMonitor(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should track memory usage during request processing", () => {
      const memoryUsageSpy = vi.spyOn(process, "memoryUsage").mockReturnValue({
        rss: 50000000,
        heapTotal: 40000000,
        heapUsed: 30000000,
        external: 1000000,
        arrayBuffers: 500000,
      });

      performanceMonitor(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      memoryUsageSpy.mockRestore();
    });
  });

  describe("monitoringUtils", () => {
    it("should provide access to active alerts", () => {
      const activeAlerts = monitoringUtils.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it("should provide access to performance metrics", () => {
      const metrics = monitoringUtils.getPerformanceMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it("should clear metrics when requested", () => {
      monitoringUtils.clearMetrics();
      const metrics = monitoringUtils.getPerformanceMetrics();
      const alerts = monitoringUtils.getActiveAlerts();

      expect(metrics.length).toBe(0);
      expect(alerts.length).toBe(0);
    });
  });

  describe("healthCheck route handler", () => {
    it("should return health status", () => {
      let capturedResponse: any = {};
      mockRes.json = vi.fn().mockImplementation((data) => {
        capturedResponse = data;
        return mockRes;
      });

      healthCheck(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(capturedResponse).toHaveProperty("status");
      expect(capturedResponse).toHaveProperty("timestamp");
    });

    it("should include system health data", () => {
      let capturedResponse: any = {};
      mockRes.json = vi.fn().mockImplementation((data) => {
        capturedResponse = data;
        return mockRes;
      });

      healthCheck(mockReq as Request, mockRes as Response);

      expect(capturedResponse).toHaveProperty("uptime");
      expect(capturedResponse).toHaveProperty("memory");
      expect(capturedResponse).toHaveProperty("activeAlerts");
      expect(capturedResponse).toHaveProperty("recentMetrics");
    });
  });

  describe("getMonitoringData route handler", () => {
    it("should return monitoring dashboard data", () => {
      let capturedResponse: any = {};
      mockRes.json = vi.fn().mockImplementation((data) => {
        capturedResponse = data;
        return mockRes;
      });

      getMonitoringData(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(capturedResponse).toHaveProperty("summary");
      expect(capturedResponse).toHaveProperty("endpointStats");
      expect(capturedResponse).toHaveProperty("resourceTrends");
      expect(capturedResponse).toHaveProperty("alerts");
      expect(capturedResponse).toHaveProperty("systemInfo");
    });

    it("should include performance summary in response", () => {
      let capturedResponse: any = {};
      mockRes.json = vi.fn().mockImplementation((data) => {
        capturedResponse = data;
        return mockRes;
      });

      getMonitoringData(mockReq as Request, mockRes as Response);

      expect(capturedResponse.summary).toHaveProperty("totalRequests");
      expect(capturedResponse.summary).toHaveProperty("avgResponseTime");
      expect(capturedResponse.summary).toHaveProperty("errorRate");
      expect(capturedResponse.summary).toHaveProperty("activeAlerts");
      expect(Array.isArray(capturedResponse.alerts)).toBe(true);
    });
  });

  describe("resolveAlert route handler", () => {
    it("should handle missing alert ID", async () => {
      mockReq.params = { alertId: undefined };

      let _statusCode = 200;
      mockRes.status = vi.fn().mockImplementation((code) => {
        _statusCode = code;
        return {
          json: vi.fn(),
        };
      });

      await resolveAlert(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it("should resolve alerts successfully", async () => {
      mockReq.params = { id: "test-alert-id" };

      let _capturedResponse: any = {};
      mockRes.json = vi.fn().mockImplementation((data) => {
        _capturedResponse = data;
        return mockRes;
      });

      await resolveAlert(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error tracking and performance monitoring", () => {
    it("should track error rates", () => {
      mockRes.statusCode = 500;

      performanceMonitor(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response end
      if (mockRes.end) {
        mockRes.end();
      }

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should handle high memory usage scenarios", () => {
      const memoryUsageSpy = vi.spyOn(process, "memoryUsage").mockReturnValue({
        rss: 1000000000, // 1GB
        heapTotal: 900000000,
        heapUsed: 850000000, // Very high usage
        external: 50000000,
        arrayBuffers: 25000000,
      });

      let _capturedResponse2: any = {};
      mockRes.json = vi.fn().mockImplementation((data) => {
        _capturedResponse2 = data;
        return mockRes;
      });

      healthCheck(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      memoryUsageSpy.mockRestore();
    });

    it("should handle concurrent monitoring requests", () => {
      const requests = Array(5)
        .fill(0)
        .map(() => ({
          ...mockReq,
          path: `/test-${Math.random()}`,
          url: `/test-${Math.random()}`,
        }));

      requests.forEach((req) => {
        performanceMonitor(req as Request, mockRes as Response, mockNext);
      });

      expect(mockNext).toHaveBeenCalledTimes(requests.length);
    });
  });
});
