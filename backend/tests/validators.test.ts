import { describe, it, expect } from "vitest";
import { createEmailSchema, senderSchema, emailSearchSchema } from "../src/validators/index.js";

describe("Zod Request Payloads Validation", () => {
  it("should validate a valid sender schema", () => {
    const validSender = {
      emailAddress: "sales@reachinbox.ai",
      displayName: "ReachInbox Sales",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUsername: "sales@reachinbox.ai",
      smtpPassword: "mySecretPassword123"
    };

    const parsed = senderSchema.parse(validSender);
    expect(parsed.emailAddress).toBe("sales@reachinbox.ai");
    expect(parsed.smtpPort).toBe(587);
  });

  it("should reject invalid email in sender schema", () => {
    const invalid = {
      emailAddress: "not-an-email",
      displayName: "Bad Sender",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUsername: "bad",
      smtpPassword: "pwd"
    };

    expect(() => senderSchema.parse(invalid)).toThrow("Invalid email address format");
  });

  it("should validate email creation with future schedule date", () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const payload = {
      senderId: "123e4567-e89b-12d3-a456-426614174000",
      recipients: ["prospect@client.com"],
      subject: "Partnership Inquiry",
      body: "<p>Hello, let us connect!</p>",
      scheduledAt: futureDate
    };

    const parsed = createEmailSchema.parse(payload);
    expect(parsed.recipients).toHaveLength(1);
    expect(parsed.subject).toBe("Partnership Inquiry");
  });

  it("should apply default pagination in search schema", () => {
    const query = {};
    const parsed = emailSearchSchema.parse(query);

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.sortBy).toBe("createdAt");
    expect(parsed.sortOrder).toBe("desc");
  });
});
