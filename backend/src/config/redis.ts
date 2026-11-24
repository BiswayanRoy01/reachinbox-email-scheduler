import { Redis } from "ioredis";
import { config } from "./index.js";
import { logger } from "../utils/logger.js";

export const redisConnection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  }
});

redisConnection.on("connect", () => {
  logger.info("Connected to Redis successfully");
});

redisConnection.on("error", (err) => {
  logger.error("Redis connection error:", { error: err.message });
});
