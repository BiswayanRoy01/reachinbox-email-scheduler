import { prisma } from "../config/prisma.js";
import { emailService } from "./email.service.js";

export class CampaignService {
  public async getCampaigns(userId: string) {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { emails: true }
        }
      }
    });

    // Compute progress stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (camp) => {
        const counts = await prisma.email.groupBy({
          by: ["status"],
          where: { campaignId: camp.id },
          _count: true
        });

        const statusCounts: Record<string, number> = {
          DRAFT: 0,
          SCHEDULED: 0,
          PROCESSING: 0,
          SENT: 0,
          FAILED: 0,
          CANCELLED: 0
        };

        counts.forEach((c) => {
          statusCounts[c.status] = c._count;
        });

        return {
          ...camp,
          stats: statusCounts
        };
      })
    );

    return campaignsWithStats;
  }

  public async getCampaignById(id: string, userId: string) {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id, userId },
      include: {
        emails: {
          select: {
            id: true,
            recipient: true,
            subject: true,
            status: true,
            scheduledAt: true,
            sentAt: true,
            errorMessage: true,
            etherealPreviewUrl: true
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!campaign) return null;

    const stats = {
      total: campaign.emails.length,
      sent: campaign.emails.filter((e) => e.status === "SENT").length,
      failed: campaign.emails.filter((e) => e.status === "FAILED").length,
      scheduled: campaign.emails.filter((e) => e.status === "SCHEDULED").length,
      draft: campaign.emails.filter((e) => e.status === "DRAFT").length
    };

    return {
      ...campaign,
      stats
    };
  }

  public async createCampaign(userId: string, data: any) {
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId,
        name: data.name,
        status: data.recipients?.length > 0 && data.scheduledAt ? "SCHEDULED" : "DRAFT",
        totalRecipients: data.recipients?.length || 0
      }
    });

    // If recipients and email content provided, create emails for this campaign
    if (data.recipients && data.recipients.length > 0 && data.senderId && data.subject && data.body) {
      await emailService.createEmails(userId, {
        senderId: data.senderId,
        campaignId: campaign.id,
        recipients: data.recipients,
        subject: data.subject,
        body: data.body,
        scheduledAt: data.scheduledAt
      });
    }

    return this.getCampaignById(campaign.id, userId);
  }
}

export const campaignService = new CampaignService();
