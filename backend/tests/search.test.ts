import { describe, it, expect, vi } from "vitest";
import { searchService } from "../src/services/search.service.js";
import { prisma } from "../src/config/prisma.js";
import { elasticsearchService } from "../src/integrations/elasticsearch/elasticsearch.service.js";

describe("Search Service (PostgreSQL & Prisma Fallback)", () => {
  const userId = "test-user-id";

  it("should enforce user data isolation by scoping where clause to userId", async () => {
    let capturedWhere: any = null;

    // Fast-fail Elasticsearch to test Postgres fallback immediately without network timeout
    vi.spyOn(elasticsearchService, "searchEmails").mockResolvedValue(null);

    vi.spyOn(prisma.email, "count").mockImplementation(async (args: any) => {
      capturedWhere = args.where;
      return 1;
    });

    vi.spyOn(prisma.email, "findMany").mockResolvedValue([
      {
        id: "email-1",
        userId,
        recipient: "candidate@reachinbox.ai",
        subject: "Hiring test",
        body: "Hello",
        status: "SENT"
      }
    ] as any);

    const result = await searchService.searchEmails(userId, {
      q: "Hiring",
      status: "SENT",
      page: 1,
      limit: 10
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.engine).toBe("postgresql");

    // Verify user isolation in Prisma WHERE condition
    expect(capturedWhere.AND).toContainEqual({ userId });
  });

  it("should calculate pagination metadata correctly", async () => {
    vi.spyOn(elasticsearchService, "searchEmails").mockResolvedValue(null);
    vi.spyOn(prisma.email, "count").mockResolvedValue(55);
    vi.spyOn(prisma.email, "findMany").mockResolvedValue([]);

    const result = await searchService.searchEmails(userId, {
      page: 2,
      limit: 20
    });

    expect(result.meta.total).toBe(55);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPrevPage).toBe(true);
  });
});
