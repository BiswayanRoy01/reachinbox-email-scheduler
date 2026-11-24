import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/redis.js";
import { checkElasticsearchHealth } from "../config/elasticsearch.js";

export class HealthController {
  public async checkHealth(_req: Request, res: Response): Promise<void> {
    const healthStatus: Record<string, any> = {
      status: "UP",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      services: {
        database: "UNKNOWN",
        redis: "UNKNOWN",
        elasticsearch: "UNKNOWN"
      }
    };

    let isHealthy = true;

    // Check PostgreSQL connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthStatus.services.database = "CONNECTED";
    } catch (dbError: any) {
      isHealthy = false;
      healthStatus.services.database = `ERROR: ${dbError.message}`;
    }

    // Check Redis connection
    try {
      const pingResult = await redisConnection.ping();
      healthStatus.services.redis = pingResult === "PONG" ? "CONNECTED" : pingResult;
    } catch (redisError: any) {
      isHealthy = false;
      healthStatus.services.redis = `ERROR: ${redisError.message}`;
    }

    // Check Elasticsearch connection
    try {
      const esCheck = await checkElasticsearchHealth();
      healthStatus.services.elasticsearch = esCheck.connected
        ? "CONNECTED"
        : `UNREACHABLE: ${esCheck.error || "No response"} (Search fallback: PostgreSQL active)`;
    } catch (esError: any) {
      healthStatus.services.elasticsearch = `ERROR: ${esError.message}`;
    }

    healthStatus.status = isHealthy ? "UP" : "DEGRADED";
    res.status(isHealthy ? 200 : 503).json(healthStatus);
  }
}

export const healthController = new HealthController();
