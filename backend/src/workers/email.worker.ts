import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/prisma.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { EmailJobData, EmailAttachment } from "../types/index.js";
import { EMAIL_QUEUE_NAME, emailQueue } from "../queues/email.queue.js";
import { smtpService } from "../integrations/smtp/smtp.service.js";
import { slackService } from "../integrations/slack/slack.service.js";
import { rateLimiterService } from "../services/rate-limiter.service.js";
import { elasticsearchService } from "../integrations/elasticsearch/elasticsearch.service.js";

/**
 * Worker processor function for single email job
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<any> {
  const { emailId, userId, senderId, campaignId } = job.data;
  logger.info(`Processing email job ${job.id} for email ${emailId}`);

  // 1. Fetch current email record from PostgreSQL (source of truth)
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: true,
      campaign: true
    }
  });

  if (!email) {
    logger.warn(`Email record ${emailId} not found in database. Skipping job.`);
    return { skipped: true, reason: "RECORD_NOT_FOUND" };
  }

  // 2. Verify status: if cancelled or already sent, abort safely (idempotent guard)
  if (email.status === "CANCELLED") {
    logger.info(`Email ${emailId} was cancelled by user. Skipping delivery.`);
    return { skipped: true, reason: "CANCELLED" };
  }

  if (email.status === "SENT") {
    logger.info(`Email ${emailId} is already marked as SENT. Skipping idempotent retry.`);
    return { skipped: true, reason: "ALREADY_SENT" };
  }

  // 3. Sender validation
  if (!email.sender || !email.sender.isActive) {
    const errorMsg = "Assigned sender account is inactive or deleted";
    await prisma.email.update({
      where: { id: emailId },
      data: { status: "FAILED", errorMessage: errorMsg, failureReason: errorMsg }
    });
    await elasticsearchService.updateEmailStatus(emailId, "FAILED", null, errorMsg);
    await slackService.notifyEmailFailed(userId, {
      recipient: email.recipient,
      subject: email.subject,
      id: email.id,
      error: errorMsg
    });
    return { success: false, reason: errorMsg };
  }

  // 4. Rate Limiting and Inter-email delay check
  const rateLimitResult = await rateLimiterService.checkAndConsume(
    email.senderId,
    email.sender.hourlyLimit,
    email.campaign?.delayBetweenEmails
  );

  if (!rateLimitResult.allowed) {
    const delayMs = rateLimitResult.retryAfterMs || 5000;
    logger.warn(
      `Rate limit or delay enforced for sender ${email.senderId}. Delaying job ${job.id} by ${delayMs}ms. Reason: ${rateLimitResult.reason}`
    );

    // If hourly limit exceeded, notify user via Slack (deduplicated per window)
    if (rateLimitResult.reason === "HOURLY_LIMIT_EXCEEDED") {
      await slackService.notifyRateLimitReached(userId, email.senderId, {
        senderEmail: email.sender.emailAddress,
        hourlyLimit: rateLimitResult.hourlyLimit,
        campaignName: email.campaign?.name
      });
    }

    // Reschedule job cleanly without failing it
    await job.moveToDelayed(Date.now() + delayMs, job.token);
    return { delayed: true, delayMs, reason: rateLimitResult.reason };
  }

  // 5. Update status to PROCESSING atomically
  await prisma.email.update({
    where: { id: emailId },
    data: {
      status: "PROCESSING",
      retryCount: { increment: 1 }
    }
  });

  try {
    // 6. Send email via SMTP
    const attachments = (email.attachments as unknown as EmailAttachment[]) || [];

    const result = await smtpService.sendEmail({
      senderConfig: {
        host: email.sender.smtpHost,
        port: email.sender.smtpPort,
        user: email.sender.smtpUsername,
        pass: email.sender.smtpPassword,
        fromName: email.sender.displayName
      },
      fromEmail: email.sender.emailAddress,
      fromName: email.sender.displayName,
      to: email.recipient,
      subject: email.subject,
      html: email.body,
      attachments
    });

    // 7. Update status to SENT
    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        errorMessage: null,
        failureReason: null,
        etherealPreviewUrl: result.previewUrl ? String(result.previewUrl) : null
      }
    });

    // 8. Update Elasticsearch search index
    await elasticsearchService.updateEmailStatus(emailId, "SENT", updatedEmail.sentAt);

    logger.info(`Email ${emailId} successfully sent to ${email.recipient}`);

    // 9. Slack notification for sent email
    await slackService.notifyEmailSent(userId, {
      id: email.id,
      recipient: email.recipient,
      subject: email.subject,
      previewUrl: updatedEmail.etherealPreviewUrl
    });

    // 10. Check if campaign completed
    if (campaignId) {
      await checkAndUpdateCampaignStatus(campaignId, userId);
    }

    return { success: true, messageId: result.messageId, previewUrl: result.previewUrl };
  } catch (error: any) {
    logger.error(`Failed to send email ${emailId}:`, { error: error.message });

    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;

    // Update email record with error details
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: isFinalAttempt ? "FAILED" : "SCHEDULED",
        errorMessage: error.message || "Failed to deliver email",
        failureReason: error.message || "SMTP delivery error"
      }
    });

    await elasticsearchService.updateEmailStatus(
      emailId,
      isFinalAttempt ? "FAILED" : "SCHEDULED",
      null,
      error.message
    );

    if (isFinalAttempt) {
      await slackService.notifyEmailFailed(userId, {
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        error: error.message
      });

      if (campaignId) {
        await checkAndUpdateCampaignStatus(campaignId, userId);
      }
    }

    throw error; // Re-throw so BullMQ retries with exponential backoff if attempts remain
  }
}

/**
 * Checks campaign completion status and updates accordingly
 */
async function checkAndUpdateCampaignStatus(campaignId: string, userId: string): Promise<void> {
  const pendingCount = await prisma.email.count({
    where: {
      campaignId,
      status: { in: ["SCHEDULED", "PROCESSING", "DRAFT"] }
    }
  });

  if (pendingCount === 0) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        emails: {
          select: { status: true }
        }
      }
    });

    if (campaign && campaign.status !== "COMPLETED") {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" }
      });

      const sentCount = campaign.emails.filter((e) => e.status === "SENT").length;
      const failedCount = campaign.emails.filter((e) => e.status === "FAILED").length;

      logger.info(`Campaign ${campaignId} (${campaign.name}) completed!`);

      await slackService.notifyCampaignCompleted(userId, {
        id: campaign.id,
        name: campaign.name,
        total: campaign.totalRecipients,
        sent: sentCount,
        failed: failedCount
      });
    }
  }
}

/**
 * Startup reconciliation:
 * Scans PostgreSQL for stranded PROCESSING or lost SCHEDULED emails and re-enqueues them
 */
export async function reconcileScheduledEmails(): Promise<void> {
  logger.info("Starting email job reconciliation...");

  try {
    // 1. Recover stranded PROCESSING emails (crash recovery)
    const strandedEmails = await prisma.email.findMany({
      where: {
        status: "PROCESSING",
        updatedAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000) // stuck in processing for > 5 mins
        }
      }
    });

    for (const email of strandedEmails) {
      logger.warn(`Recovering stranded email ${email.id} back to SCHEDULED`);
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "SCHEDULED" }
      });
    }

    // 2. Fetch all SCHEDULED emails
    const scheduledEmails = await prisma.email.findMany({
      where: {
        status: "SCHEDULED"
      }
    });

    let reScheduledCount = 0;

    for (const email of scheduledEmails) {
      const jobId = `email-job-${email.id}`;
      const existingJob = await emailQueue.getJob(jobId);

      // If job is missing from Redis queue or has failed, re-enqueue it
      if (!existingJob) {
        let delay = 0;
        if (email.scheduledAt) {
          delay = Math.max(0, new Date(email.scheduledAt).getTime() - Date.now());
        }

        await emailQueue.add(
          "send-email",
          {
            emailId: email.id,
            userId: email.userId,
            senderId: email.senderId,
            campaignId: email.campaignId,
            scheduledTime: email.scheduledAt ? email.scheduledAt.toISOString() : undefined
          },
          {
            jobId,
            delay
          }
        );
        reScheduledCount++;
      }
    }

    logger.info(
      `Reconciliation complete: checked ${scheduledEmails.length} scheduled emails, restored ${reScheduledCount} missing queue jobs`
    );
  } catch (error: any) {
    logger.error("Error during email reconciliation:", { error: error.message });
  }
}

/**
 * Initializes and starts the BullMQ email worker
 */
export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
    limiter: {
      max: config.worker.maxEmailsPerHour,
      duration: 3600000
    }
  });

  worker.on("ready", () => {
    logger.info(`BullMQ Email Worker started with concurrency ${config.worker.concurrency}`);
  });

  worker.on("completed", (job) => {
    logger.info(`BullMQ Worker: Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`BullMQ Worker: Job ${job?.id} failed with error:`, { error: err.message });
  });

  worker.on("error", (err) => {
    logger.error("BullMQ Worker encountered an internal error:", { error: err.message });
  });

  return worker;
}

// Standalone execution support
if (process.argv[1]?.endsWith("email.worker.ts") || process.argv[1]?.endsWith("email.worker.js")) {
  reconcileScheduledEmails().then(() => {
    startEmailWorker();
  });
}
