import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  logger.error("Unhandled error encountered:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message
      }))
    });
    return;
  }

  // Prisma unique constraint violation (P2002)
  if (err.code === "P2002") {
    res.status(409).json({
      success: false,
      message: `A record with this ${err.meta?.target || "field"} already exists.`
    });
    return;
  }

  // Prisma record not found (P2025)
  if (err.code === "P2025") {
    res.status(404).json({
      success: false,
      message: "The requested resource was not found."
    });
    return;
  }

  // Multer errors
  if (err.name === "MulterError") {
    res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.isOperational ? err.message : (statusCode === 500 ? "Internal server error" : err.message)
  });
}
