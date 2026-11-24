import { prisma } from "../config/prisma.js";
import { EmailStatus, Prisma } from "@prisma/client";
import { elasticsearchService } from "../integrations/elasticsearch/elasticsearch.service.js";
import { logger } from "../utils/logger.js";

export interface EmailSearchParams {
  q?: string;
  recipient?: string;
  sender?: string;
  subject?: string;
  body?: string;
  status?: EmailStatus;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "scheduledAt" | "sentAt" | "recipient" | "subject";
  sortOrder?: "asc" | "desc";
}

export class SearchService {
  /**
   * Performs advanced email search:
   * 1. Attempts Elasticsearch query for scalable text search
   * 2. If Elasticsearch is unreachable, gracefully falls back to PostgreSQL
   * Strictly scoped to the authenticated user in both engines
   */
  public async searchEmails(userId: string, params: EmailSearchParams) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    let esFallbackReason: string | undefined;

    // 1. Try Elasticsearch
    try {
      const esResult = await elasticsearchService.searchEmails(userId, {
        ...params,
        page,
        limit
      });

      if (esResult && esResult.emailIds.length > 0) {
        // Fetch full email records from PostgreSQL (source of truth)
        const emails = await prisma.email.findMany({
          where: {
            id: { in: esResult.emailIds },
            userId // strict tenant isolation
          },
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
        });

        // Preserve Elasticsearch ordering
        const orderedEmails = esResult.emailIds
          .map((id) => emails.find((e) => e.id === id))
          .filter(Boolean);

        return {
          items: orderedEmails,
          meta: {
            page,
            limit,
            total: esResult.total,
            totalPages: Math.ceil(esResult.total / limit),
            hasNextPage: page * limit < esResult.total,
            hasPrevPage: page > 1,
            engine: "elasticsearch"
          }
        };
      } else if (esResult && esResult.emailIds.length === 0 && esResult.total === 0) {
        return {
          items: [],
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            engine: "elasticsearch"
          }
        };
      } else {
        esFallbackReason = "Elasticsearch returned no index results for this query";
      }
    } catch (esErr: any) {
      esFallbackReason = esErr.message || "Elasticsearch error";
      logger.warn(`Elasticsearch search failed, falling back to PostgreSQL: ${esErr.message}`);
    }

    // 2. Fallback to PostgreSQL
    const pgResult = await this.searchPostgres(userId, params);
    return {
      ...pgResult,
      meta: {
        ...pgResult.meta,
        engine: "postgresql",
        fallbackReason: esFallbackReason
      }
    };
  }

  /**
   * PostgreSQL-based search fallback
   */
  public async searchPostgres(userId: string, params: EmailSearchParams) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;
    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";

    const whereConditions: Prisma.EmailWhereInput[] = [
      { userId } // Security: Enforce tenant isolation
    ];

    if (params.q && params.q.trim()) {
      const term = params.q.trim();
      whereConditions.push({
        OR: [
          { recipient: { contains: term, mode: "insensitive" } },
          { subject: { contains: term, mode: "insensitive" } },
          { body: { contains: term, mode: "insensitive" } },
          { sender: { emailAddress: { contains: term, mode: "insensitive" } } },
          { sender: { displayName: { contains: term, mode: "insensitive" } } }
        ]
      });
    }

    if (params.recipient) {
      whereConditions.push({
        recipient: { contains: params.recipient.trim(), mode: "insensitive" }
      });
    }

    if (params.sender) {
      whereConditions.push({
        sender: {
          OR: [
            { emailAddress: { contains: params.sender.trim(), mode: "insensitive" } },
            { displayName: { contains: params.sender.trim(), mode: "insensitive" } }
          ]
        }
      });
    }

    if (params.subject) {
      whereConditions.push({
        subject: { contains: params.subject.trim(), mode: "insensitive" }
      });
    }

    if (params.body) {
      whereConditions.push({
        body: { contains: params.body.trim(), mode: "insensitive" }
      });
    }

    if (params.status) {
      whereConditions.push({
        status: params.status
      });
    }

    if (params.campaignId) {
      whereConditions.push({
        campaignId: params.campaignId
      });
    }

    if (params.startDate || params.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (params.startDate) dateFilter.gte = new Date(params.startDate);
      if (params.endDate) dateFilter.lte = new Date(params.endDate);
      whereConditions.push({ createdAt: dateFilter });
    }

    const whereClause: Prisma.EmailWhereInput = {
      AND: whereConditions
    };

    const [total, items] = await Promise.all([
      prisma.email.count({ where: whereClause }),
      prisma.email.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
        hasPrevPage: page > 1,
        engine: "postgresql"
      }
    };
  }
}

export const searchService = new SearchService();
