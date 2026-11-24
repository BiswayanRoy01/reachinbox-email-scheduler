import { redisConnection } from "../config/redis.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export class RateLimiterService {
  /**
   * Generates the Redis key for a sender's current hourly window.
   */
  public getHourlyKey(senderId: string, timestamp = Date.now()): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    return `ratelimit:sender:${senderId}:${year}${month}${day}${hour}`;
  }

  /**
   * Key used to enforce minimum delay between successive emails from the same sender.
   */
  public getDelayKey(senderId: string): string {
    return `ratelimit:sender:delay:${senderId}`;
  }

  /**
   * Atomic rate limit check using Redis.
   * senderHourlyLimit allows overriding per sender, bounded by system MAX_EMAILS_PER_HOUR
   */
  public async checkAndConsume(
    senderId: string,
    senderHourlyLimit?: number,
    campaignDelaySeconds?: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterMs?: number;
    hourlyLimit: number;
    reason?: "HOURLY_LIMIT_EXCEEDED" | "DELAY_BETWEEN_EMAILS";
  }> {
    const hourlyKey = this.getHourlyKey(senderId);
    const delayKey = this.getDelayKey(senderId);

    // Enforce configured maximum limit as ceiling
    const systemMax = config.worker.maxEmailsPerHour;
    const maxPerHour = senderHourlyLimit ? Math.min(senderHourlyLimit, systemMax) : systemMax;

    // Delay between emails (campaign override or system default)
    const delaySeconds =
      campaignDelaySeconds !== undefined
        ? Math.max(1, campaignDelaySeconds)
        : config.worker.delayBetweenEmailsSeconds;

    // Check if inter-email delay is currently active for this sender
    const delayExists = await redisConnection.exists(delayKey);
    if (delayExists) {
      const pttl = await redisConnection.pttl(delayKey);
      return {
        allowed: false,
        remaining: 0,
        hourlyLimit: maxPerHour,
        retryAfterMs: Math.max(pttl, 500),
        reason: "DELAY_BETWEEN_EMAILS"
      };
    }

    // Atomic increment of hourly counter
    const count = await redisConnection.incr(hourlyKey);
    if (count === 1) {
      await redisConnection.expire(hourlyKey, 3700);
    }

    if (count > maxPerHour) {
      // Calculate remaining milliseconds in the current UTC hour window
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
      const msUntilNextHour = Math.max(1000, nextHour.getTime() - now.getTime());

      logger.warn(
        `Rate limit reached for sender ${senderId}. Count: ${count}/${maxPerHour}. Rescheduling in ${msUntilNextHour}ms`
      );

      return {
        allowed: false,
        remaining: 0,
        hourlyLimit: maxPerHour,
        retryAfterMs: msUntilNextHour,
        reason: "HOURLY_LIMIT_EXCEEDED"
      };
    }

    // Set delay lock for this sender
    if (delaySeconds > 0) {
      await redisConnection.set(delayKey, "locked", "EX", delaySeconds);
    }

    return {
      allowed: true,
      hourlyLimit: maxPerHour,
      remaining: Math.max(0, maxPerHour - count)
    };
  }

  /**
   * Gets current usage count for the sender in the current hour
   */
  public async getCurrentHourlyUsage(senderId: string): Promise<number> {
    const hourlyKey = this.getHourlyKey(senderId);
    const val = await redisConnection.get(hourlyKey);
    return val ? parseInt(val, 10) : 0;
  }
}

export const rateLimiterService = new RateLimiterService();
