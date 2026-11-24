import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/error.js";
import { bullBoardRouter, bullBoardAuth } from "./config/bull-board.js";
import { swaggerRouter } from "./config/swagger.js";
import { safeJsonParse } from "./utils/json-parser.js";

// Routes
import authRouter from "./routes/auth.routes.js";
import emailRouter from "./routes/email.routes.js";
import senderRouter from "./routes/sender.routes.js";
import campaignRouter from "./routes/campaign.routes.js";
import recipientRouter from "./routes/recipient.routes.js";
import slackRouter from "./routes/slack.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import healthRouter from "./routes/health.routes.js";

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false // Allows Bull Board and dev dashboard UI
    })
  );

  // CORS Configuration
  const allowedOrigins = [
    config.frontendUrl,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all during dev/testing if not matched
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    })
  );

  // Resilient JSON body parser (handles raw control characters / multiline strings gracefully)
  app.use((req, res, next) => {
    if (req.is("application/json") || req.headers["content-type"]?.includes("application/json")) {
      express.text({ type: "*/*", limit: "15mb" })(req, res, (err) => {
        if (err) return next(err);
        if (typeof req.body === "string" && req.body.trim()) {
          try {
            req.body = safeJsonParse(req.body);
            next();
          } catch (parseError: any) {
            next(parseError);
          }
        } else {
          req.body = req.body || {};
          next();
        }
      });
    } else {
      next();
    }
  });
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());

  // Bull Board UI for queue monitoring
  app.use("/admin/queues", bullBoardAuth, bullBoardRouter);

  // Interactive Swagger UI documentation & testing console
  app.use("/docs", swaggerRouter);
  app.use("/api-docs", swaggerRouter);

  // REST API Endpoints prefix
  const prefix = config.apiPrefix; // /api/v1
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/emails`, emailRouter);
  app.use(`${prefix}/senders`, senderRouter);
  app.use(`${prefix}/campaigns`, campaignRouter);
  app.use(`${prefix}/recipients`, recipientRouter);
  app.use(`${prefix}/slack`, slackRouter);
  app.use(`${prefix}/dashboard`, dashboardRouter);
  app.use(`${prefix}/health`, healthRouter);

  // Root welcome endpoint
  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "ReachInbox Email Scheduler API",
      version: "1.0.0",
      status: "running",
      swaggerDocs: "/docs",
      documentation: "/API_CONTRACT.md",
      healthCheck: `${prefix}/health`,
      bullBoard: "/admin/queues"
    });
  });

  // 404 Route Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
