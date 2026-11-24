import nodemailer from "nodemailer";
import { prisma } from "../config/prisma.js";
import { encrypt } from "../utils/crypto.js";
import { smtpService, SmtpService } from "../integrations/smtp/smtp.service.js";
import { logger } from "../utils/logger.js";

export class SenderService {
  /**
   * Retrieves all sender accounts for a user
   */
  public async getSenders(userId: string) {
    const senders = await prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        emailAddress: true,
        displayName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        isActive: true,
        hourlyLimit: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return senders;
  }

  /**
   * Gets single sender by ID ensuring ownership
   */
  public async getSenderById(id: string, userId: string) {
    return prisma.sender.findFirst({
      where: { id, userId },
      select: {
        id: true,
        emailAddress: true,
        displayName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        isActive: true,
        hourlyLimit: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Creates a new sender account with encrypted SMTP password
   */
  public async createSender(userId: string, data: any) {
    // Test SMTP connection before saving
    await smtpService.verifyConnection({
      host: data.smtpHost,
      port: data.smtpPort,
      user: data.smtpUsername,
      pass: data.smtpPassword
    });

    const encryptedPassword = encrypt(data.smtpPassword);

    const sender = await prisma.sender.create({
      data: {
        userId,
        emailAddress: data.emailAddress || data.email,
        displayName: data.displayName,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUsername: data.smtpUsername,
        smtpPassword: encryptedPassword,
        isActive: data.isActive ?? true,
        hourlyLimit: data.hourlyLimit || 100
      },
      select: {
        id: true,
        emailAddress: true,
        displayName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        isActive: true,
        hourlyLimit: true,
        createdAt: true
      }
    });

    logger.info(`Sender created for user ${userId}: ${sender.emailAddress}`);
    return sender;
  }

  /**
   * Auto-provisions an Ethereal test sender for easy testing
   */
  public async createEtherealSender(userId: string, displayName?: string) {
    // Disable internal nodemailer caching to allow generating multiple distinct test senders
    process.env.ETHEREAL_CACHE = "false";

    const currentCount = await prisma.sender.count({ where: { userId } });
    const senderName = displayName || `Ethereal Test Sender #${currentCount + 1}`;

    let testAccount: nodemailer.TestAccount | null = null;
    let attempts = 0;

    while (attempts < 3) {
      attempts++;
      try {
        const candidate = await nodemailer.createTestAccount();
        const duplicate = await prisma.sender.findFirst({
          where: { userId, emailAddress: candidate.user }
        });
        if (!duplicate) {
          testAccount = candidate;
          break;
        }
      } catch (err: any) {
        logger.warn("createTestAccount attempt failed, retrying...", { error: err.message });
      }
    }

    if (!testAccount) {
      testAccount = await SmtpService.getOrCreateEtherealAccount();
    }

    // Ensure unique email address per user so multiple senders can always be created
    let emailAddress = testAccount.user;
    const existing = await prisma.sender.findFirst({
      where: { userId, emailAddress }
    });
    if (existing) {
      const uniqueSuffix = Date.now().toString(36);
      const [local, domain] = emailAddress.split("@");
      emailAddress = `${local}+${uniqueSuffix}@${domain || "ethereal.email"}`;
    }

    const encryptedPassword = encrypt(testAccount.pass);

    const sender = await prisma.sender.create({
      data: {
        userId,
        emailAddress,
        displayName: senderName,
        smtpHost: testAccount.smtp?.host || "smtp.ethereal.email",
        smtpPort: testAccount.smtp?.port || 587,
        smtpUsername: testAccount.user,
        smtpPassword: encryptedPassword,
        isActive: true,
        hourlyLimit: 100
      },
      select: {
        id: true,
        emailAddress: true,
        displayName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        isActive: true,
        hourlyLimit: true,
        createdAt: true
      }
    });

    logger.info(`Ethereal test sender created for user ${userId}: ${sender.emailAddress}`);
    return sender;
  }

  /**
   * Updates an existing sender
   */
  public async updateSender(id: string, userId: string, data: any) {
    const existing = await prisma.sender.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new Error("Sender not found or unauthorized");
    }

    const updateData: any = { ...data };
    if (data.email) {
      updateData.emailAddress = data.email;
      delete updateData.email;
    }
    if (data.smtpPassword) {
      updateData.smtpPassword = encrypt(data.smtpPassword);
    }

    const updated = await prisma.sender.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        emailAddress: true,
        displayName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        isActive: true,
        hourlyLimit: true,
        updatedAt: true
      }
    });

    return updated;
  }

  /**
   * Deletes a sender
   */
  public async deleteSender(id: string, userId: string) {
    const existing = await prisma.sender.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new Error("Sender not found or unauthorized");
    }

    const emailCount = await prisma.email.count({
      where: { senderId: id }
    });

    if (emailCount > 0) {
      return prisma.sender.update({
        where: { id },
        data: { isActive: false }
      });
    }

    return prisma.sender.delete({
      where: { id }
    });
  }

  /**
   * Verifies existing sender credentials
   */
  public async verifySender(id: string, userId: string): Promise<boolean> {
    const sender = await prisma.sender.findFirst({
      where: { id, userId }
    });

    if (!sender) {
      throw new Error("Sender not found or unauthorized");
    }

    return smtpService.verifyConnection({
      host: sender.smtpHost,
      port: sender.smtpPort,
      user: sender.smtpUsername,
      pass: sender.smtpPassword
    });
  }
}

export const senderService = new SenderService();
