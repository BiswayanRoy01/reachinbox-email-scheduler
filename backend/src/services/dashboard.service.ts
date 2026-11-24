import { prisma } from "../config/prisma.js";

export class DashboardService {
  /**
   * Retrieves aggregated email and campaign statistics for a user
   */
  public async getStats(userId: string) {
    const [
      statusCounts,
      totalEmails,
      totalCampaigns,
      totalSenders,
      activeSenders
    ] = await Promise.all([
      prisma.email.groupBy({
        by: ["status"],
        where: { userId },
        _count: true
      }),
      prisma.email.count({ where: { userId } }),
      prisma.emailCampaign.count({ where: { userId } }),
      prisma.sender.count({ where: { userId } }),
      prisma.sender.count({ where: { userId, isActive: true } })
    ]);

    const statsMap: Record<string, number> = {
      DRAFT: 0,
      SCHEDULED: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      CANCELLED: 0
    };

    statusCounts.forEach((sc) => {
      statsMap[sc.status] = sc._count;
    });

    return {
      emails: {
        total: totalEmails,
        draft: statsMap.DRAFT,
        scheduled: statsMap.SCHEDULED,
        processing: statsMap.PROCESSING,
        sent: statsMap.SENT,
        failed: statsMap.FAILED,
        cancelled: statsMap.CANCELLED,
        deliveryRate: totalEmails > 0 ? Number(((statsMap.SENT / (statsMap.SENT + statsMap.FAILED || 1)) * 100).toFixed(1)) : 100
      },
      campaigns: {
        total: totalCampaigns
      },
      senders: {
        total: totalSenders,
        active: activeSenders
      }
    };
  }

  /**
   * Retrieves recent email activity and 7-day volume timeline
   */
  public async getActivity(userId: string, limit = 15) {
    const recentEmails = await prisma.email.findMany({
      where: { userId },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        recipient: true,
        subject: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        errorMessage: true,
        etherealPreviewUrl: true,
        createdAt: true,
        sender: {
          select: {
            displayName: true,
            emailAddress: true
          }
        }
      }
    });

    // 7-day trend calculation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pastWeekEmails = await prisma.email.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        status: true,
        createdAt: true
      }
    });

    const dailyBreakdown: Record<string, { sent: number; failed: number; scheduled: number }> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      dailyBreakdown[dateKey] = { sent: 0, failed: 0, scheduled: 0 };
    }

    pastWeekEmails.forEach((email) => {
      const dateKey = email.createdAt.toISOString().split("T")[0];
      if (dailyBreakdown[dateKey]) {
        if (email.status === "SENT") dailyBreakdown[dateKey].sent++;
        else if (email.status === "FAILED") dailyBreakdown[dateKey].failed++;
        else if (email.status === "SCHEDULED") dailyBreakdown[dateKey].scheduled++;
      }
    });

    const timeline = Object.entries(dailyBreakdown).map(([date, counts]) => ({
      date,
      ...counts
    }));

    return {
      recentActivity: recentEmails,
      timeline
    };
  }
}

export const dashboardService = new DashboardService();
