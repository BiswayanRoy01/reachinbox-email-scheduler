import { prisma } from "../config/prisma.js";
import { emailQueueService } from "../queues/email.queue.js";
import { elasticsearchService } from "../integrations/elasticsearch/elasticsearch.service.js";
import { logger } from "../utils/logger.js";
import { EmailStatus, Prisma } from "@prisma/client";

export class EmailService {
  /**
   * Creates one or multiple emails (one per recipient) with optional idempotency key
   */
  public async createEmails(
    userId: string,
    data: {
      senderId: string;
      campaignId?: string | null;
      recipients: string[];
      subject: string;
      body: string;
      scheduledAt?: string | null;
      sendImmediately?: boolean;
      idempotencyKey?: string;
      attachments?: any[];
    }
  ) {
    // If idempotencyKey provided and email already exists, return existing to prevent duplication
    if (data.idempotencyKey) {
      const existing = await prisma.email.findUnique({
        where: { idempotencyKey: data.idempotencyKey }
      });
      if (existing) {
        logger.info(`Idempotent request matched existing email ${existing.id}`);
        return [existing];
      }
    }

    // Verify sender belongs to user and is active
    const sender = await prisma.sender.findFirst({
      where: { id: data.senderId, userId, isActive: true }
    });

    if (!sender) {
      throw new Error("Invalid or inactive sender specified");
    }

    const scheduledDate = data.sendImmediately
      ? new Date()
      : data.scheduledAt
      ? new Date(data.scheduledAt)
      : null;

    const initialStatus: EmailStatus = scheduledDate ? "SCHEDULED" : "DRAFT";

    const createdEmails = [];

    for (let i = 0; i < data.recipients.length; i++) {
      const recipient = data.recipients[i];
      // Generate per-recipient idempotency key if base key was given
      const perRecipientKey = data.idempotencyKey
        ? `${data.idempotencyKey}-${i}`
        : undefined;

      const email = await prisma.email.create({
        data: {
          userId,
          senderId: data.senderId,
          campaignId: data.campaignId || null,
          recipient: recipient.toLowerCase().trim(),
          subject: data.subject,
          body: data.body,
          scheduledAt: scheduledDate,
          status: initialStatus,
          idempotencyKey: perRecipientKey,
          attachments: data.attachments ? (data.attachments as Prisma.InputJsonValue) : undefined
        }
      });

      // If scheduled or sendImmediately, add to BullMQ queue
      if (scheduledDate) {
        const jobId = await emailQueueService.scheduleEmailJob(
          email.id,
          userId,
          data.senderId,
          data.campaignId,
          scheduledDate
        );
        await prisma.email.update({
          where: { id: email.id },
          data: { queueJobId: jobId }
        });
      }

      // Index in Elasticsearch asynchronously
      elasticsearchService.indexEmail({
        emailId: email.id,
        userId: email.userId,
        campaignId: email.campaignId,
        senderEmail: sender.emailAddress,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt ? email.scheduledAt.toISOString() : null,
        sentAt: null,
        createdAt: email.createdAt.toISOString()
      }).catch((err) => logger.warn(`ES indexing error on create: ${err.message}`));

      createdEmails.push(email);
    }

    logger.info(`Created ${createdEmails.length} email records for user ${userId}`);
    return createdEmails;
  }

  /**
   * Bulk creation of emails from parsed recipient list with template interpolation
   */
  public async bulkCreateEmails(
    userId: string,
    data: {
      senderId: string;
      campaignId?: string | null;
      campaignName?: string;
      recipients: Array<{ email: string; metadata?: Record<string, any> }>;
      subject: string;
      body: string;
      scheduledAt?: string | null;
      sendImmediately?: boolean;
      attachments?: any[];
    }
  ) {
    const sender = await prisma.sender.findFirst({
      where: { id: data.senderId, userId, isActive: true }
    });

    if (!sender) {
      throw new Error("Invalid or inactive sender specified");
    }

    let campaignId = data.campaignId;

    if (!campaignId && data.campaignName) {
      const campaign = await prisma.emailCampaign.create({
        data: {
          userId,
          senderId: data.senderId,
          name: data.campaignName,
          subject: data.subject,
          body: data.body,
          totalRecipients: data.recipients.length,
          status: data.sendImmediately || data.scheduledAt ? "SCHEDULED" : "DRAFT"
        }
      });
      campaignId = campaign.id;
    }

    const scheduledDate = data.sendImmediately
      ? new Date()
      : data.scheduledAt
      ? new Date(data.scheduledAt)
      : null;

    const initialStatus: EmailStatus = scheduledDate ? "SCHEDULED" : "DRAFT";

    const createdEmails = [];

    for (const item of data.recipients) {
      // Template interpolation for {{key}} from metadata
      let interpolatedSubject = data.subject;
      let interpolatedBody = data.body;

      if (item.metadata) {
        for (const [key, value] of Object.entries(item.metadata)) {
          const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
          interpolatedSubject = interpolatedSubject.replace(placeholder, String(value ?? ""));
          interpolatedBody = interpolatedBody.replace(placeholder, String(value ?? ""));
        }
      }

      const email = await prisma.email.create({
        data: {
          userId,
          senderId: data.senderId,
          campaignId,
          recipient: item.email.toLowerCase().trim(),
          subject: interpolatedSubject,
          body: interpolatedBody,
          scheduledAt: scheduledDate,
          status: initialStatus,
          attachments: data.attachments ? (data.attachments as Prisma.InputJsonValue) : undefined
        }
      });

      if (scheduledDate) {
        const jobId = await emailQueueService.scheduleEmailJob(
          email.id,
          userId,
          data.senderId,
          campaignId,
          scheduledDate
        );
        await prisma.email.update({
          where: { id: email.id },
          data: { queueJobId: jobId }
        });
      }

      elasticsearchService.indexEmail({
        emailId: email.id,
        userId: email.userId,
        campaignId: email.campaignId,
        senderEmail: sender.emailAddress,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt ? email.scheduledAt.toISOString() : null,
        sentAt: null,
        createdAt: email.createdAt.toISOString()
      }).catch((err) => logger.warn(`ES indexing error on bulk create: ${err.message}`));

      createdEmails.push(email);
    }

    if (campaignId) {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { totalRecipients: createdEmails.length }
      });
    }

    return {
      campaignId,
      createdCount: createdEmails.length,
      emails: createdEmails
    };
  }

  /**
   * Retrieves single email by ID
   */
  public async getEmailById(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id, userId },
      include: {
        sender: {
          select: {
            id: true,
            emailAddress: true,
            displayName: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    if (!email) return null;

    let jobInfo = null;
    if (email.queueJobId || email.status === "SCHEDULED") {
      jobInfo = await emailQueueService.getJobStatus(email.id);
    }

    return {
      ...email,
      queueInfo: jobInfo
    };
  }

  /**
   * Updates an existing email draft or scheduled email
   */
  public async updateEmail(id: string, userId: string, data: any) {
    const existing = await prisma.email.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new Error("Email not found or unauthorized");
    }

    if (existing.status === "SENT" || existing.status === "PROCESSING") {
      throw new Error(`Cannot update email with status ${existing.status}`);
    }

    const scheduledDate =
      data.scheduledAt !== undefined
        ? data.scheduledAt
          ? new Date(data.scheduledAt)
          : null
        : existing.scheduledAt;

    const updated = await prisma.email.update({
      where: { id },
      data: {
        ...data,
        scheduledAt: scheduledDate,
        status: scheduledDate ? "SCHEDULED" : "DRAFT"
      }
    });

    if (scheduledDate) {
      const jobId = await emailQueueService.scheduleEmailJob(
        id,
        userId,
        updated.senderId,
        updated.campaignId,
        scheduledDate
      );
      await prisma.email.update({
        where: { id },
        data: { queueJobId: jobId }
      });
    }

    return updated;
  }

  /**
   * Cancels a scheduled email
   */
  public async cancelEmail(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id, userId }
    });

    if (!email) {
      throw new Error("Email not found or unauthorized");
    }

    if (email.status === "SENT") {
      throw new Error("Cannot cancel an email that has already been sent");
    }

    await emailQueueService.cancelEmailJob(id);

    const updated = await prisma.email.update({
      where: { id },
      data: {
        status: "CANCELLED",
        errorMessage: "Cancelled by user"
      }
    });

    elasticsearchService.updateEmailStatus(id, "CANCELLED").catch(() => {});

    logger.info(`Email ${id} cancelled by user ${userId}`);
    return updated;
  }

  /**
   * Retries a failed or cancelled email
   */
  public async retryEmail(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id, userId }
    });

    if (!email) {
      throw new Error("Email not found or unauthorized");
    }

    if (email.status === "SENT") {
      throw new Error("Email has already been sent successfully");
    }

    const scheduledDate = new Date();

    const updated = await prisma.email.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        errorMessage: null,
        failureReason: null,
        scheduledAt: scheduledDate
      }
    });

    const jobId = await emailQueueService.scheduleEmailJob(
      id,
      userId,
      email.senderId,
      email.campaignId,
      scheduledDate
    );

    await prisma.email.update({
      where: { id },
      data: { queueJobId: jobId }
    });

    elasticsearchService.updateEmailStatus(id, "SCHEDULED").catch(() => {});

    logger.info(`Email ${id} requeued for retry by user ${userId}`);
    return updated;
  }

  /**
   * Triggers immediate sending of a draft or scheduled email
   */
  public async sendImmediately(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id, userId }
    });

    if (!email) {
      throw new Error("Email not found or unauthorized");
    }

    if (email.status === "SENT") {
      throw new Error("Email is already sent");
    }

    const scheduledDate = new Date();

    const updated = await prisma.email.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: scheduledDate
      }
    });

    const jobId = await emailQueueService.scheduleEmailJob(
      id,
      userId,
      email.senderId,
      email.campaignId,
      scheduledDate
    );

    await prisma.email.update({
      where: { id },
      data: { queueJobId: jobId }
    });

    return updated;
  }

  /**
   * Deletes an email draft or cancelled email
   */
  public async deleteEmail(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id, userId }
    });

    if (!email) {
      throw new Error("Email not found or unauthorized");
    }

    if (email.status === "PROCESSING") {
      throw new Error("Cannot delete email currently being processed");
    }

    await emailQueueService.cancelEmailJob(id);

    return prisma.email.delete({
      where: { id }
    });
  }

  /**
   * Lists emails with status filter and pagination
   */
  public async getEmails(
    userId: string,
    filters: {
      status?: EmailStatus;
      campaignId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailWhereInput = {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {})
    };

    const [total, items] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              emailAddress: true,
              displayName: true
            }
          },
          campaign: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + limit < total,
        hasPrevPage: page > 1
      }
    };
  }
}

export const emailService = new EmailService();
