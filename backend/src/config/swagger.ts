import swaggerUi from "swagger-ui-express";
import { Router } from "express";

export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "ReachInbox.ai Email Scheduler Platform API",
    version: "1.0.0",
    description: `
**Interactive API Documentation and Testing Console for ReachInbox.ai Backend**

### 🚀 Quick Testing Guide
1. Go to **Authentication** > \`POST /api/v1/auth/dev-login\` and click **Try it out** -> **Execute**.
2. Copy the \`token\` from the response.
3. Click the green **Authorize** button at the top right of this page and paste the token.
4. Go to **Senders** > \`POST /api/v1/senders/ethereal\` and click **Execute** to provision a test sender.
5. Go to **Emails** > \`POST /api/v1/emails/schedule\` to send or schedule cold emails with Ethereal SMTP & BullMQ!
6. Monitor live jobs in the **[Bull Board Dashboard](/admin/queues)** (Username: \`admin\`, Password: \`admin_password\`).
`
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local / Docker Environment"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from /api/v1/auth/dev-login or Google OAuth"
      }
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully" },
          data: { type: "object" }
        }
      },
      Email: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          recipient: { type: "string", format: "email" },
          subject: { type: "string" },
          body: { type: "string" },
          status: { type: "string", enum: ["DRAFT", "SCHEDULED", "PROCESSING", "SENT", "FAILED", "CANCELLED"] },
          scheduledAt: { type: "string", format: "date-time", nullable: true },
          sentAt: { type: "string", format: "date-time", nullable: true },
          etherealPreviewUrl: { type: "string", nullable: true }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["System Health"],
        summary: "Check health of PostgreSQL, Redis, and Elasticsearch",
        security: [],
        responses: {
          "200": {
            description: "All services healthy",
            content: { "application/json": { schema: { type: "object" } } }
          }
        }
      }
    },
    "/api/v1/auth/dev-login": {
      post: {
        tags: ["Authentication"],
        summary: "Instant test login (generates JWT token without Google credentials)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", example: "test.engineer@reachinbox.ai" },
                  name: { type: "string", example: "Test Engineer" }
                },
                required: ["email"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Returns JWT token and user info" }
        }
      }
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current authenticated user profile",
        responses: {
          "200": { description: "User profile" },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Clear session token cookie",
        security: [],
        responses: {
          "200": { description: "Logged out successfully" }
        }
      }
    },
    "/api/v1/senders": {
      get: {
        tags: ["Senders"],
        summary: "List all sender accounts for current user",
        responses: {
          "200": { description: "List of senders" }
        }
      },
      post: {
        tags: ["Senders"],
        summary: "Create custom SMTP sender account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  emailAddress: { type: "string", format: "email", example: "outreach@company.com" },
                  displayName: { type: "string", example: "Alex Sales" },
                  smtpHost: { type: "string", example: "smtp.mailgun.org" },
                  smtpPort: { type: "integer", example: 587 },
                  smtpUsername: { type: "string", example: "postmaster@company.com" },
                  smtpPassword: { type: "string", example: "secretPassword123" },
                  hourlyLimit: { type: "integer", example: 100 }
                },
                required: ["emailAddress", "displayName", "smtpHost", "smtpUsername", "smtpPassword"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Sender created" }
        }
      }
    },
    "/api/v1/senders/ethereal": {
      post: {
        tags: ["Senders"],
        summary: "⚡ One-Click Auto-Provision Ethereal Test Sender",
        description: "Creates an ephemeral Ethereal SMTP account immediately configured and ready for test email delivery with web preview links.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: { type: "string", example: "Ethereal Test Sender" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Ethereal test sender provisioned" }
        }
      }
    },
    "/api/v1/senders/{id}": {
      get: {
        tags: ["Senders"],
        summary: "Get sender details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Sender details" } }
      },
      patch: {
        tags: ["Senders"],
        summary: "Update sender configuration",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: { type: "string" },
                  hourlyLimit: { type: "integer" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Sender updated" } }
      },
      delete: {
        tags: ["Senders"],
        summary: "Delete or deactivate sender",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Sender deleted or marked inactive" } }
      }
    },
    "/api/v1/senders/{id}/verify": {
      post: {
        tags: ["Senders"],
        summary: "Test SMTP connection credentials for sender",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Verification status" } }
      }
    },
    "/api/v1/emails/schedule": {
      post: {
        tags: ["Emails & Scheduling"],
        summary: "Schedule or immediately send emails",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  senderId: { type: "string", format: "uuid" },
                  campaignId: { type: "string", format: "uuid", nullable: true },
                  recipients: {
                    type: "array",
                    items: { type: "string", format: "email" },
                    example: ["prospect1@client.com", "prospect2@client.com"]
                  },
                  subject: { type: "string", example: "Quick question on outbound campaigns" },
                  body: { type: "string", example: "<h1>Hello!</h1><p>We'd love to connect with your team.</p>" },
                  scheduledAt: { type: "string", format: "date-time", example: "2026-11-25T14:00:00.000Z", nullable: true },
                  sendImmediately: { type: "boolean", example: true },
                  idempotencyKey: { type: "string", example: "test-req-123", nullable: true }
                },
                required: ["senderId", "recipients", "subject", "body"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Emails scheduled / queued for sending" }
        }
      }
    },
    "/api/v1/emails/scheduled": {
      get: {
        tags: ["Emails & Scheduling"],
        summary: "List all currently scheduled emails",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: { "200": { description: "Paginated scheduled emails" } }
      }
    },
    "/api/v1/emails/sent": {
      get: {
        tags: ["Emails & Scheduling"],
        summary: "List all successfully sent emails with Ethereal preview links",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: { "200": { description: "Paginated sent emails" } }
      }
    },
    "/api/v1/emails/sync-elasticsearch": {
      post: {
        tags: ["Emails & Scheduling"],
        summary: "⚡ Sync & Populate PostgreSQL Emails to Elasticsearch",
        description: "Scans all emails in the database, ensures the Elasticsearch index exists, and synchronizes them into Elasticsearch for full-text search.",
        responses: {
          "200": { description: "Synchronization completed" }
        }
      }
    },
    "/api/v1/emails/search": {
      get: {
        tags: ["Emails & Scheduling"],
        summary: "🔍 Full-Text Search across emails (Elasticsearch + Postgres fallback)",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Full-text search keyword" },
          { name: "recipient", in: "query", schema: { type: "string" } },
          { name: "sender", in: "query", schema: { type: "string" } },
          { name: "subject", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "SCHEDULED", "PROCESSING", "SENT", "FAILED", "CANCELLED"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: { "200": { description: "Search results with pagination" } }
      }
    },
    "/api/v1/emails/{id}": {
      get: {
        tags: ["Emails & Scheduling"],
        summary: "Get email details (includes live BullMQ queue status & preview link)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Email details" } }
      },
      delete: {
        tags: ["Emails & Scheduling"],
        summary: "Delete draft or cancelled email",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted successfully" } }
      }
    },
    "/api/v1/emails/{id}/cancel": {
      post: {
        tags: ["Emails & Scheduling"],
        summary: "Cancel scheduled email (removes job from BullMQ)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Email cancelled" } }
      }
    },
    "/api/v1/emails/{id}/retry": {
      post: {
        tags: ["Emails & Scheduling"],
        summary: "Retry failed email",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Email requeued" } }
      }
    },
    "/api/v1/emails/{id}/send": {
      post: {
        tags: ["Emails & Scheduling"],
        summary: "Send scheduled or draft email immediately",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Queued for immediate delivery" } }
      }
    },
    "/api/v1/emails/bulk": {
      post: {
        tags: ["Emails & Scheduling"],
        summary: "Bulk schedule emails with template interpolation (e.g. {{name}})",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  senderId: { type: "string", format: "uuid" },
                  campaignName: { type: "string", example: "Outreach Campaign 1" },
                  subject: { type: "string", example: "Hello {{name}} at {{company}}" },
                  body: { type: "string", example: "<p>Hi {{name}}, let's discuss {{company}}.</p>" },
                  recipients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        email: { type: "string", format: "email" },
                        metadata: { type: "object" }
                      }
                    },
                    example: [
                      { email: "alice@acme.com", metadata: { name: "Alice", company: "Acme Inc" } },
                      { email: "bob@tech.com", metadata: { name: "Bob", company: "Tech Corp" } }
                    ]
                  },
                  sendImmediately: { type: "boolean", example: true }
                },
                required: ["senderId", "subject", "body", "recipients"]
              }
            }
          }
        },
        responses: { "201": { description: "Bulk emails scheduled" } }
      }
    },
    "/api/v1/campaigns": {
      get: {
        tags: ["Campaigns"],
        summary: "List campaigns with aggregated metrics",
        responses: { "200": { description: "Campaigns list" } }
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create new email campaign",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Q4 Outreach" },
                  senderId: { type: "string", format: "uuid" },
                  subject: { type: "string", example: "Demo Invitation" },
                  body: { type: "string", example: "<p>Check out our tool!</p>" },
                  recipients: { type: "array", items: { type: "string" }, example: ["lead@domain.com"] },
                  scheduledAt: { type: "string", format: "date-time" }
                },
                required: ["name"]
              }
            }
          }
        },
        responses: { "201": { description: "Campaign created" } }
      }
    },
    "/api/v1/campaigns/{id}": {
      get: {
        tags: ["Campaigns"],
        summary: "Get campaign details and progress",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Campaign details" } }
      }
    },
    "/api/v1/recipients/validate": {
      post: {
        tags: ["CSV & Recipients"],
        summary: "Validate recipient email list (detects syntax errors and duplicates)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  recipients: {
                    type: "array",
                    items: { type: "object" },
                    example: [
                      { email: "valid@domain.com", name: "Valid User" },
                      { email: "invalid-email-address", name: "Bad User" },
                      { email: "valid@domain.com", name: "Duplicate" }
                    ]
                  }
                },
                required: ["recipients"]
              }
            }
          }
        },
        responses: { "200": { description: "Validation results" } }
      }
    },
    "/api/v1/slack/status": {
      get: {
        tags: ["Slack Integration"],
        summary: "Get user's active Slack connection status",
        responses: { "200": { description: "Connection status" } }
      }
    },
    "/api/v1/slack/disconnect": {
      post: {
        tags: ["Slack Integration"],
        summary: "Disconnect Slack workspace",
        responses: { "200": { description: "Disconnected" } }
      }
    },
    "/api/v1/dashboard/stats": {
      get: {
        tags: ["Dashboard & Analytics"],
        summary: "Get real-time email, sender, and campaign statistics",
        responses: { "200": { description: "Statistics object" } }
      }
    },
    "/api/v1/dashboard/activity": {
      get: {
        tags: ["Dashboard & Analytics"],
        summary: "Get recent email activity and 7-day volume timeline",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 15 } }],
        responses: { "200": { description: "Activity timeline" } }
      }
    }
  }
};

export const swaggerRouter = Router();
swaggerRouter.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
