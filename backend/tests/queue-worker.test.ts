import { describe, it, expect, vi } from "vitest";
import { getDeterministicJobId } from "../src/queues/email.queue.js";
import { processEmailJob } from "../src/workers/email.worker.js";
import { prisma } from "../src/config/prisma.js";

describe("Queue and Worker Behavior", () => {
  it("should generate deterministic job ID based on email ID", () => {
    const emailId = "123e4567-e89b-12d3-a456-426614174000";
    const jobId1 = getDeterministicJobId(emailId);
    const jobId2 = getDeterministicJobId(emailId);

    expect(jobId1).toBe("email-job-123e4567-e89b-12d3-a456-426614174000");
    expect(jobId1).toEqual(jobId2);
  });

  it("should skip delivery if email record is marked CANCELLED", async () => {
    vi.spyOn(prisma.email, "findUnique").mockResolvedValue({
      id: "email-1",
      status: "CANCELLED",
      recipient: "test@example.com",
      subject: "Test",
      sender: { isActive: true }
    } as any);

    const mockJob = {
      id: "job-1",
      data: { emailId: "email-1", userId: "user-1", senderId: "sender-1" }
    } as any;

    const result = await processEmailJob(mockJob);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("CANCELLED");
  });

  it("should skip delivery if email is already marked SENT (idempotent guard)", async () => {
    vi.spyOn(prisma.email, "findUnique").mockResolvedValue({
      id: "email-2",
      status: "SENT",
      recipient: "test@example.com",
      subject: "Test",
      sender: { isActive: true }
    } as any);

    const mockJob = {
      id: "job-2",
      data: { emailId: "email-2", userId: "user-1", senderId: "sender-1" }
    } as any;

    const result = await processEmailJob(mockJob);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("ALREADY_SENT");
  });
});
