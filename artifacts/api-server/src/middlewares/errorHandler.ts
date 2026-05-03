import type { ErrorRequestHandler, RequestHandler } from "express";

function isZodError(err: unknown): err is { name: string; issues: Array<{ path: (string | number)[]; message: string }> } {
  return typeof err === "object" && err !== null
    && (err as { name?: string }).name === "ZodError"
    && Array.isArray((err as { issues?: unknown }).issues);
}

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: "Not Found",
    code: "NOT_FOUND",
    path: req.originalUrl,
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const log = (req as { log?: { error: (obj: unknown, msg: string) => void } }).log;
  log?.error({ err, url: req.originalUrl, method: req.method }, "request failed");

  if (res.headersSent) return;

  if (isZodError(err)) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      issues: err.issues.map(i => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code ?? "HTTP_ERROR",
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: isProd ? "Internal server error" : message,
    code: "INTERNAL_ERROR",
  });
};
