import { describe, it, expect, vi } from "vitest";
import { elasticsearchService } from "../src/integrations/elasticsearch/elasticsearch.service.js";
import { esClient } from "../src/config/elasticsearch.js";

describe("Elasticsearch Service Integration & Isolation", () => {
  it("should index email document into Elasticsearch", async () => {
    vi.spyOn(esClient.indices, "exists").mockResolvedValue(true as never);
    vi.spyOn(esClient, "index").mockResolvedValue({ result: "created" } as any);

    const doc = {
      emailId: "email-test-uuid",
      userId: "user-test-uuid",
      campaignId: null,
      senderEmail: "sales@reachinbox.ai",
      recipient: "prospect@example.com",
      subject: "Partnership Proposal",
      body: "Hello, let us connect",
      status: "SCHEDULED",
      scheduledAt: new Date().toISOString(),
      sentAt: null,
      createdAt: new Date().toISOString()
    };

    const success = await elasticsearchService.indexEmail(doc);
    expect(success).toBe(true);
  });

  it("should enforce tenant user_id in Elasticsearch query clauses", async () => {
    let capturedSearchQuery: any = null;

    vi.spyOn(esClient, "search").mockImplementation(async (args: any) => {
      capturedSearchQuery = args.query;
      return {
        hits: {
          total: { value: 1, relation: "eq" },
          hits: [{ _id: "email-test-uuid", _source: { emailId: "email-test-uuid" } }]
        }
      } as any;
    });

    const result = await elasticsearchService.searchEmails("user-isolated-123", {
      q: "Partnership",
      status: "SCHEDULED"
    });

    expect(result).toBeDefined();
    expect(result?.emailIds).toContain("email-test-uuid");
    expect(result?.total).toBe(1);

    // Verify tenant isolation filter
    const mustClauses = capturedSearchQuery.bool.must;
    expect(mustClauses).toContainEqual({ term: { userId: "user-isolated-123" } });
  });

  it("should update document status when email is sent", async () => {
    vi.spyOn(esClient, "update").mockResolvedValue({ result: "updated" } as any);

    const success = await elasticsearchService.updateEmailStatus(
      "email-test-uuid",
      "SENT",
      new Date()
    );
    expect(success).toBe(true);
  });
});
