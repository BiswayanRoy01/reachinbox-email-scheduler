import { Queue, JobsOptions } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { EmailJobData } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const EMAIL_QUEUE_NAME = "email-queue";

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000 // 5s, 10s, 20s
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24h
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // keep failed jobs for 7 days
    }
  }
});

/**
 * Deterministic BullMQ job ID generator to prevent duplicate jobs
 */
export function getDeterministicJobId(emailId: string): string {
  return `email-job-${emailId}`;
}

export class EmailQueueService {
  /**
   * Adds an email sending job to the queue.
   * If scheduledAt is in the future, adds with delay.
   * If scheduledAt is past or null, queues for immediate delivery.
   */
  public async scheduleEmailJob(
    emailId: string,
    userId: string,
    senderId: string,
    campaignId?: string | null,
    scheduledAt?: Date | null
  ): Promise<string> {
    const jobId = getDeterministicJobId(emailId);
    let delay = 0;

    if (scheduledAt) {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      delay = Math.max(0, diff);
    }

    const jobData: EmailJobData = {
      emailId,
      userId,
      senderId,
      campaignId,
      scheduledTime: scheduledAt ? scheduledAt.toISOString() : undefined
    };

    const options: JobsOptions = {
      jobId,
      delay
    };

    // Check if job already exists
    const existingJob = await emailQueue.getJob(jobId);
    if (existingJob) {
      logger.info(`Job ${jobId} already exists in queue, removing old job to reschedule`);
      await existingJob.remove();
    }

    const job = await emailQueue.add("send-email", jobData, options);
    logger.info(`Scheduled job ${job.id} for email ${emailId} with delay ${delay}ms`);
    return job.id as string;
  }

  /**
   * Cancels a queued job by job ID or email ID
   */
  public async cancelEmailJob(emailId: string): Promise<boolean> {
    const jobId = getDeterministicJobId(emailId);
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Removed job ${jobId} from email queue`);
      return true;
    }
    return false;
  }

  /**
   * Gets job state by email ID
   */
  public async getJobStatus(emailId: string) {
    const jobId = getDeterministicJobId(emailId);
    const job = await emailQueue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    return {
      id: job.id,
      state,
      attemptsMade: job.attemptsMade,
      delay: job.opts.delay
    };
  }
}

export const emailQueueService = new EmailQueueService();
