import winston from "winston";
import { config } from "../config/index.js";

const sensitiveKeys = ["password", "smtpPassword", "accessToken", "clientSecret", "authorization", "cookie"];

const maskSensitiveData = winston.format((info) => {
  const mask = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(mask);
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        masked[key] = "***REDACTED***";
      } else if (typeof value === "object" && value !== null) {
        masked[key] = mask(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  };

  return mask(info);
});

export const logger = winston.createLogger({
  level: config.env === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    maskSensitiveData(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "reachinbox-backend" },
  transports: [
    new winston.transports.Console({
      format:
        config.env === "production"
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
                const stackStr = stack ? `\n${stack}` : "";
                return `[${timestamp}] ${level}: ${message}${metaStr}${stackStr}`;
              })
            )
    })
  ]
});
