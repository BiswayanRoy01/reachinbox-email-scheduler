import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiterService } from "../src/services/rate-limiter.service.js";
import { redisConnection } from "../src/config/redis.js";

describe("Distributed Rate Limiter Service", () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    rateLimiter = new RateLimiterService();
    vi.restoreAllMocks();
  });

  it("should allow sending when usage is within max limit", async () => {
    vi.spyOn(redisConnection, "exists").mockResolvedValue(0 as never);
    vi.spyOn(redisConnection, "incr").mockResolvedValue(1 as never);
    vi.spyOn(redisConnection, "expire").mockResolvedValue(1 as never);
    vi.spyOn(redisConnection, "set").mockResolvedValue("OK" as never);

    const result = await rateLimiter.checkAndConsume("sender-uuid-1");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("should reject and provide retryAfterMs when hourly limit is exceeded", async () => {
    vi.spyOn(redisConnection, "exists").mockResolvedValue(0 as never);
    vi.spyOn(redisConnection, "incr").mockResolvedValue(1001 as never); // exceeds limit

    const result = await rateLimiter.checkAndConsume("sender-uuid-1");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("HOURLY_LIMIT_EXCEEDED");
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("should enforce delay between successive emails from same sender", async () => {
    vi.spyOn(redisConnection, "exists").mockResolvedValue(1 as never);
    vi.spyOn(redisConnection, "pttl").mockResolvedValue(1500 as never);

    const result = await rateLimiter.checkAndConsume("sender-uuid-1");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("DELAY_BETWEEN_EMAILS");
    expect(result.retryAfterMs).toBe(1500);
  });
});
