import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { authService } from "../src/services/auth.service.js";

describe("REST API Integration Tests", () => {
  const testUser = {
    id: "test-user-uuid-1234",
    email: "integration.test@reachinbox.ai",
    name: "Integration Test User",
    googleId: "google-test-1234"
  };

  const validToken = authService.generateToken(testUser);

  it("GET / should return service info and documentation links", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("ReachInbox Email Scheduler API");
    expect(res.body.documentation).toBe("/API_CONTRACT.md");
  });

  it("GET /api/v1/emails should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/v1/emails");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Authentication token missing");
  });

  it("GET /api/v1/emails should succeed with valid Bearer token", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(testUser as any);
    vi.spyOn(prisma.email, "count").mockResolvedValue(0);
    vi.spyOn(prisma.email, "findMany").mockResolvedValue([]);

    const res = await request(app)
      .get("/api/v1/emails")
      .set("Authorization", `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it("POST /api/v1/recipients/validate should validate batch recipient emails", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(testUser as any);

    const res = await request(app)
      .post("/api/v1/recipients/validate")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        recipients: [
          { email: "user1@reachinbox.ai", name: "User One" },
          { email: "invalid-syntax-email", name: "User Two" },
          { email: "user1@reachinbox.ai", name: "Duplicate User One" }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.validCount).toBe(1);
    expect(res.body.data.invalidCount).toBe(2);
  });

  it("POST /api/v1/auth/dev-login should generate a user and token", async () => {
    vi.spyOn(prisma.user, "upsert").mockResolvedValue(testUser as any);

    const res = await request(app)
      .post("/api/v1/auth/dev-login")
      .send({ email: "newuser@reachinbox.ai", name: "New User" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
  });
});
