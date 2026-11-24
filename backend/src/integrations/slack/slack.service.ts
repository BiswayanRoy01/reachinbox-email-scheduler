import https from "https";
import { WebClient } from "@slack/web-api";
import { prisma } from "../../config/prisma.js";
import { redisConnection } from "../../config/redis.js";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { decrypt, encrypt } from "../../utils/crypto.js";

const slackAgent = new https.Agent({
  rejectUnauthorized: false
});

export class SlackService {
  /**
   * Generates Slack OAuth authorization URL
   */
  public getAuthUrl(state: string): string {
    return `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=${encodeURIComponent(
      config.slack.scopes
    )}&redirect_uri=${encodeURIComponent(config.slack.redirectUri)}&state=${encodeURIComponent(state)}`;
  }

  /**
   * Handles Slack OAuth callback and stores connection in database
   */
  public async handleOAuthCallback(code: string, userId: string): Promise<any> {
    try {
      const client = new WebClient(undefined, {
        agent: slackAgent,
        retryConfig: { retries: 1 }
      });
      const response = await client.oauth.v2.access({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: config.slack.redirectUri
      });

      if (!response.ok || !response.access_token || !response.team?.id) {
        throw new Error(response.error || "Failed to exchange Slack OAuth code");
      }

      const teamId = response.team.id;
      const teamName = response.team.name || "Slack Workspace";
      const encryptedToken = encrypt(response.access_token);
      const incomingChannel = response.incoming_webhook?.channel;

      const connection = await prisma.slackConnection.upsert({
        where: {
          userId_teamId: {
            userId,
            teamId
          }
        },
        update: {
          accessToken: encryptedToken,
          teamName,
          channelName: incomingChannel || null,
          isActive: true
        },
        create: {
          userId,
          teamId,
          teamName,
          channelName: incomingChannel || null,
          accessToken: encryptedToken,
          isActive: true
        }
      });

      logger.info(`Slack connected successfully for user ${userId}, team ${teamName}`);
      return connection;
    } catch (error: any) {
      logger.error("Slack OAuth exchange failed:", { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnects a user's Slack workspace
   */
  public async disconnect(userId: string): Promise<void> {
    await prisma.slackConnection.updateMany({
      where: { userId },
      data: { isActive: false }
    });
    logger.info(`Slack connection disabled for user ${userId}`);
  }

  /**
   * Gets active Slack connection for a user
   */
  public async getConnection(userId: string) {
    return prisma.slackConnection.findFirst({
      where: { userId, isActive: true }
    });
  }

  /**
   * Sends a notification message to user's Slack
   * Never throws - email scheduling must continue even if Slack fails
   */
  public async sendNotification(
    userId: string,
    message: string,
    attachments?: any[]
  ): Promise<boolean> {
    try {
      const connection = await this.getConnection(userId);
      if (!connection || !connection.accessToken) {
        return false;
      }

      const token = decrypt(connection.accessToken);
      const client = new WebClient(token, {
        agent: slackAgent,
        retryConfig: { retries: 1 }
      });

      let targetChannel = connection.channelId;
      if (!targetChannel) {
        const list = await client.conversations.list({
          types: "public_channel",
          exclude_archived: true,
          limit: 10
        });
        const channel =
          list.channels?.find((c) => c.name === "general" || c.is_general) ||
          list.channels?.[0];
        if (channel && channel.id) {
          targetChannel = channel.id;
        }
      }

      if (!targetChannel) {
        logger.warn(`No target Slack channel found for user ${userId}`);
        return false;
      }

      await client.chat.postMessage({
        channel: targetChannel,
        text: message,
        attachments
      });

      logger.info(`Slack notification sent to user ${userId} channel ${targetChannel}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send Slack notification for user ${userId}:`, {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Real-time rate-limit notification sent to Slack with deduplication per window
   */
  public async notifyRateLimitReached(
    userId: string,
    senderId: string,
    details: {
      senderEmail: string;
      hourlyLimit: number;
      campaignName?: string;
    }
  ): Promise<boolean> {
    try {
      // Deduplicate: Send only once per sender per hourly window
      const now = new Date();
      const hourKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
        now.getUTCDate()
      ).padStart(2, "0")}${String(now.getUTCHours()).padStart(2, "0")}`;
      const dedupKey = `ratelimit:slack_notified:${senderId}:${hourKey}`;

      const alreadyNotified = await redisConnection.set(dedupKey, "1", "EX", 3600, "NX");
      if (!alreadyNotified) {
        // Notification was already sent in this hourly window
        return false;
      }

      const campaignLine = details.campaignName ? `\nCampaign: ${details.campaignName}` : "";
      const text = `⚠️ *Email rate limit reached.*\n\n*Sender:* ${details.senderEmail}\n*Hourly limit:* ${details.hourlyLimit}${campaignLine}\n\nPending emails have been rescheduled to the next available sending window.`;

      return await this.sendNotification(userId, text, [
        {
          color: "#e2a03f",
          fields: [
            { title: "Sender", value: details.senderEmail, short: true },
            { title: "Hourly Limit", value: String(details.hourlyLimit), short: true },
            { title: "Action", value: "Rescheduled", short: false }
          ]
        }
      ]);
    } catch (err: any) {
      logger.error(`Error sending rate-limit notification for sender ${senderId}:`, {
        error: err.message
      });
      return false;
    }
  }

  /**
   * Notifies about email sent event
   */
  public async notifyEmailSent(
    userId: string,
    email: { recipient: string; subject: string; id: string; previewUrl?: string | null }
  ) {
    const previewInfo = email.previewUrl ? `\n*Preview:* <${email.previewUrl}|View in Ethereal>` : "";
    const text = `*Email Successfully Sent*\n*To:* ${email.recipient}\n*Subject:* ${email.subject}${previewInfo}`;
    return this.sendNotification(userId, text, [
      {
        color: "#2eb886",
        fields: [
          { title: "Status", value: "SENT", short: true },
          { title: "Email ID", value: email.id, short: true }
        ]
      }
    ]);
  }

  /**
   * Notifies about email failure event
   */
  public async notifyEmailFailed(
    userId: string,
    email: { recipient: string; subject: string; id: string; error: string }
  ) {
    const text = `*Email Delivery Failed*\n*To:* ${email.recipient}\n*Subject:* ${email.subject}\n*Reason:* ${email.error}`;
    return this.sendNotification(userId, text, [
      {
        color: "#a30200",
        fields: [
          { title: "Status", value: "FAILED", short: true },
          { title: "Email ID", value: email.id, short: true }
        ]
      }
    ]);
  }

  /**
   * Notifies about campaign completion event
   */
  public async notifyCampaignCompleted(
    userId: string,
    campaign: { id: string; name: string; total: number; sent: number; failed: number }
  ) {
    const text = `*Campaign Completed: ${campaign.name}*\nTotal: ${campaign.total} | Sent: ${campaign.sent} | Failed: ${campaign.failed}`;
    return this.sendNotification(userId, text, [
      {
        color: "#439FE0",
        fields: [
          { title: "Campaign ID", value: campaign.id, short: true },
          {
            title: "Success Rate",
            value: `${Math.round((campaign.sent / (campaign.total || 1)) * 100)}%`,
            short: true
          }
        ]
      }
    ]);
  }
}

export const slackService = new SlackService();
