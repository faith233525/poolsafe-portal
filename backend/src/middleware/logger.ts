import { Request, Response, NextFunction } from "express";
import pino from "pino";
import pinoHttp from "pino-http";

// Base logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { translateTime: "SYS:standard", singleLine: true } },
});

// pino-http middleware with custom serializers
const httpLogger = pinoHttp({
  logger,
  customProps: (req: any, _res: any) => {
    return {
      requestId: req.requestId,
      userId: req.user?.id,
      role: req.user?.role,
    };
  },
  serializers: {
    req(req: any) {
      return { method: req.method, url: req.url }; // omit headers for brevity
    },
    res(res: any) {
      return { statusCode: res.statusCode };
    },
  },
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  httpLogger(req, res, () => {
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      (req as any).log?.info({ durationMs }, "request_completed");
    });
    next();
  });
}

export function logError(err: any, context?: Record<string, unknown>) {
  logger.error({ err, ...context }, "error");
}
