import nodemailer, { Transporter } from "nodemailer";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { decrypt } from "../../utils/crypto.js";
import { EmailAttachment } from "../../types/index.js";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName?: string;
}

export interface SendMailOptions {
  senderConfig?: SmtpConfig;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  previewUrl?: string | false;
}

export class SmtpService {
  private static testAccount: nodemailer.TestAccount | null = null;

  /**
   * Generates or returns an Ethereal test account for development
   */
  public static async getOrCreateEtherealAccount(): Promise<nodemailer.TestAccount> {
    if (!this.testAccount) {
      this.testAccount = await nodemailer.createTestAccount();
      logger.info("Created ephemeral Ethereal test account:", {
        user: this.testAccount.user,
        pass: "***REDACTED***",
        web: this.testAccount.web
      });
    }
    return this.testAccount;
  }

  /**
   * Creates a Nodemailer transporter based on sender configuration or fallback
   */
  public async createTransporter(senderConfig?: SmtpConfig): Promise<Transporter> {
    let host = senderConfig?.host || config.smtp.host;
    let port = senderConfig?.port || config.smtp.port;
    let user = senderConfig?.user || config.smtp.user;
    let pass = senderConfig?.pass || config.smtp.pass;

    // Decrypt password if it was stored encrypted
    if (pass && pass.includes(":")) {
      pass = decrypt(pass);
    }

    // If using Ethereal without credentials, auto-provision test account in dev/test
    if ((!user || !pass) && host.includes("ethereal.email")) {
      const ethereal = await SmtpService.getOrCreateEtherealAccount();
      host = ethereal.smtp.host;
      port = ethereal.smtp.port;
      user = ethereal.user;
      pass = ethereal.pass;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: config.env === "production"
      }
    });

    return transporter;
  }

  /**
   * Verifies SMTP connection configuration
   */
  public async verifyConnection(senderConfig: SmtpConfig): Promise<boolean> {
    try {
      const transporter = await this.createTransporter(senderConfig);
      await transporter.verify();
      return true;
    } catch (error: any) {
      logger.error("SMTP verification failed:", { error: error.message });
      throw new Error(`SMTP connection check failed: ${error.message}`);
    }
  }

  /**
   * Sends an email via SMTP and returns result details including Ethereal preview URLs
   */
  public async sendEmail(options: SendMailOptions): Promise<SendMailResult> {
    const transporter = await this.createTransporter(options.senderConfig);

    const formattedAttachments = options.attachments?.map((att) => {
      if (att.content) {
        return {
          filename: att.filename,
          content: Buffer.from(att.content, "base64"),
          contentType: att.contentType
        };
      }
      return {
        filename: att.filename,
        path: att.path,
        contentType: att.contentType
      };
    });

    const info = await transporter.sendMail({
      from: `"${options.fromName}" <${options.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: formattedAttachments
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`[SMTP] Email sent via Ethereal! Preview: ${previewUrl}`);
    } else {
      logger.info(`[SMTP] Email delivered to ${options.to}. MessageId: ${info.messageId}`);
    }

    return {
      messageId: info.messageId,
      accepted: info.accepted.map(String),
      rejected: info.rejected.map(String),
      previewUrl
    };
  }
}

export const smtpService = new SmtpService();
