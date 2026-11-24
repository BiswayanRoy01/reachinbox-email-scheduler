import { describe, it, expect, vi } from "vitest";
import { slackService } from "../src/integrations/slack/slack.service.js";
import { prisma } from "../src/config/prisma.js";

describe("Slack Service Resilience", () => {
  it("should return false without throwing when Slack is not connected", async () => {
    vi.spyOn(prisma.slackConnection, "findFirst").mockResolvedValue(null);

    const result = await slackService.sendNotification("user-without-slack", "Test Message");
    expect(result).toBe(false);
  });

  it("should safely handle errors during notification delivery without breaking caller flow", async () => {
    vi.spyOn(slackService, "sendNotification").mockResolvedValue(false);

    const result = await slackService.notifyEmailSent("user-1", {
      id: "email-1",
      recipient: "test@example.com",
      subject: "Test Subject"
    });

    expect(result).toBe(false);
  });

  it("should handle notifyEmailFailed cleanly", async () => {
    vi.spyOn(slackService, "sendNotification").mockResolvedValue(false);

    const result = await slackService.notifyEmailFailed("user-1", {
      id: "email-1",
      recipient: "test@example.com",
      subject: "Test Subject",
      error: "SMTP connection failed"
    });

    expect(result).toBe(false);
  });
});
