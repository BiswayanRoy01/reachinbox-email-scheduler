import { app } from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./config/prisma.js";
import { redisConnection } from "./config/redis.js";
import { startEmailWorker, reconcileScheduledEmails } from "./workers/email.worker.js";
import { elasticsearchService } from "./integrations/elasticsearch/elasticsearch.service.js";

async function bootstrap() {
  try {
    logger.info(`Starting ReachInbox Backend in ${config.env} mode...`);

    // 1. Startup reconciliation for email scheduler
    try {
      await reconcileScheduledEmails();
    } catch (reconcileErr: any) {
      logger.warn("Reconciliation warning (DB/Redis might not be available yet):", {
        error: reconcileErr.message
      });
    }

    // 2. Sync and index PostgreSQL emails into Elasticsearch
    try {
      await elasticsearchService.syncPostgresToElasticsearch();
    } catch (esSyncErr: any) {
      logger.warn("Elasticsearch sync warning (ES might still be starting):", {
        error: esSyncErr.message
      });
    }

    // 3. Start BullMQ background worker
    let worker: any;
    try {
      worker = startEmailWorker();
    } catch (workerErr: any) {
      logger.warn("Worker startup warning (Redis might not be running yet):", {
        error: workerErr.message
      });
    }

    // 3. Start HTTP Server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📡 API endpoint: ${config.backendUrl}${config.apiPrefix}`);
      logger.info(`📊 Bull Board UI: ${config.backendUrl}/admin/queues`);
    });

    // Graceful Shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        logger.info("HTTP server closed.");
        if (worker) {
          await worker.close();
          logger.info("BullMQ Worker closed.");
        }
        await redisConnection.quit();
        logger.info("Redis connection closed.");
        await prisma.$disconnect();
        logger.info("Prisma database connection closed.");
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error: any) {
    logger.error("Failed to start application:", { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

bootstrap();
