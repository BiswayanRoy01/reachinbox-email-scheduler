import { esClient } from "../../config/elasticsearch.js";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prisma.js";

export interface ElasticsearchEmailDocument {
  emailId: string;
  userId: string;
  campaignId: string | null;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export class ElasticsearchService {
  private indexName = config.elasticsearch.index;
  private isIndexInitialized = false;

  /**
   * Ensures the reachinbox_emails index and mappings exist
   */
  public async ensureIndex(): Promise<boolean> {
    if (this.isIndexInitialized) return true;

    const exists = await esClient.indices.exists({ index: this.indexName });
    if (!exists) {
      await esClient.indices.create({
        index: this.indexName,
        mappings: {
          properties: {
            emailId: { type: "keyword" },
            userId: { type: "keyword" },
            campaignId: { type: "keyword" },
            senderEmail: { type: "keyword" },
            recipient: { type: "keyword" },
            subject: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            createdAt: { type: "date" }
          }
        }
      });
      logger.info(`Elasticsearch index '${this.indexName}' created successfully`);
    }
    this.isIndexInitialized = true;
    return true;
  }

  /**
   * Syncs existing PostgreSQL emails into Elasticsearch on boot
   */
  public async syncPostgresToElasticsearch(): Promise<number> {
    await this.ensureIndex();

    const emails = await prisma.email.findMany({
      include: { sender: { select: { emailAddress: true } } },
      take: 500
    });

    if (emails.length === 0) return 0;

    let syncedCount = 0;
    for (const email of emails) {
      await this.indexEmail({
        emailId: email.id,
        userId: email.userId,
        campaignId: email.campaignId,
        senderEmail: email.sender?.emailAddress || "unknown@reachinbox.ai",
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt ? email.scheduledAt.toISOString() : null,
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        createdAt: email.createdAt.toISOString()
      });
      syncedCount++;
    }

    logger.info(`Synced ${syncedCount} emails from PostgreSQL to Elasticsearch`);
    return syncedCount;
  }

  /**
   * Indexes an email record in Elasticsearch
   */
  public async indexEmail(doc: ElasticsearchEmailDocument): Promise<boolean> {
    try {
      await this.ensureIndex();
      await esClient.index({
        index: this.indexName,
        id: doc.emailId,
        document: doc,
        refresh: "wait_for" // Makes document immediately searchable
      });
      logger.debug(`Email indexed in Elasticsearch: ${doc.emailId}`);
      return true;
    } catch (error: any) {
      logger.warn(`Elasticsearch indexing failed for ${doc.emailId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Updates status and timestamps for an indexed email
   */
  public async updateEmailStatus(
    emailId: string,
    status: string,
    sentAt?: Date | null,
    failureReason?: string | null
  ): Promise<boolean> {
    try {
      await this.ensureIndex();
      await esClient.update({
        index: this.indexName,
        id: emailId,
        doc: {
          status,
          sentAt: sentAt ? sentAt.toISOString() : undefined,
          failureReason: failureReason || undefined
        },
        refresh: "wait_for"
      });
      logger.debug(`Elasticsearch doc updated: ${emailId} -> ${status}`);
      return true;
    } catch (error: any) {
      logger.warn(`Elasticsearch doc update failed for ${emailId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Searches emails in Elasticsearch with tenant isolation and full text / filter matching
   */
  public async searchEmails(
    userId: string,
    params: {
      q?: string;
      recipient?: string;
      sender?: string;
      subject?: string;
      body?: string;
      status?: string;
      campaignId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{ emailIds: string[]; total: number } | null> {
    try {
      const ready = await this.ensureIndex();
      if (!ready) return null;

      const mustClauses: any[] = [{ term: { userId } }];

      if (params.q) {
        mustClauses.push({
          multi_match: {
            query: params.q,
            fields: ["subject^2", "body", "recipient", "senderEmail"],
            fuzziness: "AUTO"
          }
        });
      }

      if (params.recipient) {
        mustClauses.push({
          wildcard: { recipient: `*${params.recipient.toLowerCase()}*` }
        });
      }

      if (params.sender) {
        mustClauses.push({
          wildcard: { senderEmail: `*${params.sender.toLowerCase()}*` }
        });
      }

      if (params.subject) {
        mustClauses.push({ match: { subject: params.subject } });
      }

      if (params.body) {
        mustClauses.push({ match: { body: params.body } });
      }

      if (params.status) {
        mustClauses.push({ term: { status: params.status } });
      }

      if (params.campaignId) {
        mustClauses.push({ term: { campaignId: params.campaignId } });
      }

      if (params.startDate || params.endDate) {
        const range: any = {};
        if (params.startDate) range.gte = params.startDate;
        if (params.endDate) range.lte = params.endDate;
        mustClauses.push({ range: { createdAt: range } });
      }

      const page = params.page || 1;
      const limit = params.limit || 20;
      const from = (page - 1) * limit;

      const sortField = params.sortBy === "createdAt" ? "createdAt" : params.sortBy || "createdAt";
      const sortOrder = params.sortOrder || "desc";

      const response = await esClient.search({
        index: this.indexName,
        from,
        size: limit,
        query: {
          bool: {
            must: mustClauses
          }
        },
        sort: [{ [sortField]: { order: sortOrder } }]
      });

      const total =
        typeof response.hits.total === "number"
          ? response.hits.total
          : response.hits.total?.value || 0;

      const emailIds = response.hits.hits.map((hit: any) => hit._id || hit._source.emailId);

      return {
        emailIds,
        total
      };
    } catch (error: any) {
      logger.warn(`Elasticsearch query failed, falling back to PostgreSQL: ${error.message}`);
      return null;
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
