# ReachInbox.ai — Production Cold-Email Job Scheduler Backend

A robust, scalable, and resilient email scheduling service built for **ReachInbox.ai**, a cold-email outreach platform. Engineered with **Node.js, TypeScript, Express.js, PostgreSQL (Prisma ORM), Redis, BullMQ, Elasticsearch, Nodemailer (Ethereal Email), and Docker Compose**.

---

## 1. Project Overview

The ReachInbox email scheduling backend is designed to handle high-throughput, multi-sender outbound email campaigns with:
- Guaranteed persistent queue delivery backed by BullMQ & Redis.
- Single source of truth in PostgreSQL.
- Distributed sender-specific rate limits and minimum delay intervals.
- Crash recovery and unhandled exception tolerance across restarts.
- Full-text email search with Elasticsearch (with automatic PostgreSQL fallback).
- Real-time Slack notifications when senders reach rate limits.
- Complete Google OAuth 2.0 authentication.
- Ethereal Email SMTP integration with preview links.

---

## 2. Architecture Diagram

```mermaid
flowchart TD
    Client[React Frontend / REST Client] -->|REST / JWT| API[Express API Server]
    API -->|Auth & Session| GoogleOAuth[Google OAuth 2.0]
    API -->|Store & Query| Postgres[(PostgreSQL - Source of Truth)]
    API -->|Enqueue Delayed Jobs| BullQueue[(Redis BullMQ Queue)]
    API -->|Index Email Record| ES[(Elasticsearch 8)]

    Worker[BullMQ Worker Pool] -->|Poll Due Delayed Jobs| BullQueue
    Worker -->|Fetch & Atomic State Update| Postgres
    Worker -->|Rate Limit & Inter-Email Delay| RedisAtomic[(Redis Atomic Windows)]
    Worker -->|Deliver Email| SMTP[Nodemailer / Ethereal SMTP]
    Worker -->|Update Document Status| ES
    Worker -->|Rate Limit & Sent Alerts| Slack[Slack Web API Notifications]
    
    Admin[DevOps / Operations] -->|Monitor Queues| BullBoard[Bull Board Dashboard]
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5 (Strict Mode) |
| Runtime | Node.js 18+ (tested on Node 22 & 26) |
| Framework | Express.js 4 |
| Database | PostgreSQL 16 + Prisma ORM 6 |
| Queue & Cache | Redis 7 + BullMQ 5 |
| Search Engine | Elasticsearch 8 (`@elastic/elasticsearch`) |
| SMTP Transport | Nodemailer 6 + Ethereal Email |
| Authentication | Google OAuth 2.0 (`google-auth-library`) + JWT |
| Notifications | Slack Web API (`@slack/web-api`) |
| Queue Dashboard | Bull Board 6 (`@bull-board/express`) |
| Validation | Zod 3 |
| Logging | Winston 3 (with secret redaction) |
| Testing | Vitest 3 + Supertest |
| Containerization | Docker + Docker Compose |

---

## 4. Folder Structure

```text
reachinbox-backend/
├── prisma/
│   ├── migrations/
│   │   └── 20261124000000_init/
│   │       └── migration.sql
│   └── schema.prisma
├── src/
│   ├── config/              # Redis, Prisma, Elasticsearch, Bull Board, environment config
│   ├── controllers/         # REST request handlers (Auth, Email, Sender, Campaign, Slack, CSV)
│   ├── middleware/          # JWT auth, validation, error handler, rate limit
│   ├── routes/              # Express API routers under /api/v1
│   ├── services/            # Business logic (Email, Scheduler, Search, Sender, RateLimiter, CSV)
│   ├── queues/              # BullMQ queue definition & deterministic job ID factory
│   ├── workers/             # Email worker processor, startup reconciliation
│   ├── integrations/
│   │   ├── google/          # Google OAuth client
│   │   ├── slack/           # Slack OAuth & rate limit notification service
│   │   ├── smtp/            # Nodemailer transport factory & Ethereal account generator
│   │   └── elasticsearch/   # Elasticsearch client, indexer, and search service
│   ├── validators/          # Zod request schemas
│   ├── utils/               # AES-256-GCM encryption, masked winston logger
│   ├── types/               # TypeScript interfaces & type declarations
│   ├── app.ts               # Express application initialization
│   └── server.ts            # Entrypoint & background worker bootstrapper
├── tests/                   # Vitest unit & integration test suite
├── .env.example             # Comprehensive environment template
├── Dockerfile               # Multi-stage production container build
├── docker-compose.yml       # PostgreSQL, Redis, Elasticsearch, Kibana, API, Worker
├── package.json
├── tsconfig.json
├── API_CONTRACT.md          # Full REST API specification with TypeScript interfaces
└── README.md
```

---

## 5. Installation Instructions

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (optional for containerized runtime)

```bash
# Clone and install dependencies
git clone <repo-url> reachinbox-backend
cd reachinbox-backend
npm install
```

---

## 6. Docker Setup

To run all infrastructure dependencies (PostgreSQL, Redis, Elasticsearch, Kibana, API, Worker) with persistent volumes and automated health checks:

```bash
docker-compose up --build -d
```

To stop:
```bash
docker-compose down
```

Services exposed:
- Backend API: `http://localhost:5000`
- Bull Board: `http://localhost:5000/admin/queues`
- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## 7. PostgreSQL Setup & Prisma Migrations

If running locally without Docker:
```bash
# Start PostgreSQL service, then generate and apply Prisma migrations
npx prisma generate
npx prisma migrate dev --name init
```

---

## 8. Redis Setup

Redis must be running on port 6379 (default):
```bash
redis-server
```

---

## 9. Elasticsearch Setup

If running locally:
```bash
docker run -d --name reachinbox-es -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.13.0
```
ReachInbox automatically initializes the `reachinbox_emails` index and mappings upon first launch.

---

## 10. Ethereal Configuration

No manual signup is needed! ReachInbox includes an automated on-demand Ethereal provisioner:
- Call `POST /api/v1/senders/ethereal` with your auth token.
- The service dynamically provisions an ephemeral Ethereal account, securely stores its encrypted credentials, and links it to your user.
- Every email sent logs its Ethereal web preview URL (e.g. `https://ethereal.email/message/...`), which is saved to `etherealPreviewUrl` in PostgreSQL.

---

## 11. Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the Google+ / Identity API.
3. Configure OAuth consent screen.
4. Add authorized redirect URI: `http://localhost:5000/api/v1/auth/google/callback`.
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

---

## 12. Slack OAuth Setup

1. Create an app in [Slack API Portal](https://api.slack.com/apps).
2. Add Redirect URL: `http://localhost:5000/api/v1/slack/callback`.
3. Add Bot Token Scopes: `chat:write`, `channels:read`, `groups:read`.
4. Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` in `.env`.

---

## 13. Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

| Key | Description | Default |
|---|---|---|
| `PORT` | API Port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://reachinbox:reachinbox_secret@localhost:5432/reachinbox_db?schema=public` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ELASTICSEARCH_URL` | Elasticsearch node URL | `http://localhost:9200` |
| `FRONTEND_URL` | React frontend URL | `http://localhost:3000` |
| `BACKEND_URL` | Backend URL | `http://localhost:5000` |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex encryption key | Required |
| `SESSION_SECRET` | JWT session secret | Required |
| `EMAIL_WORKER_CONCURRENCY` | Worker concurrent jobs | `5` |
| `DEFAULT_EMAIL_DELAY_SECONDS` | Delay between emails from same sender | `2` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Hourly limit per sender | `100` |
| `BULL_BOARD_USERNAME` | Queue dashboard user | `admin` |
| `BULL_BOARD_PASSWORD` | Queue dashboard password | `admin_password` |

---

## 14. Running the API Server

```bash
# Development (with hot-reload)
npm run dev

# Production
npm run build
npm start
```

---

## 15. Running the BullMQ Worker

The worker can run embedded inside the main server or as a dedicated standalone background service:

```bash
# Standalone dedicated worker process
npm run worker
```

---

## 16. Running Tests

```bash
# Run full Vitest suite
npm test

# Run in watch mode
npm run test:watch
```

Test coverage includes:
- Zod request schemas validation.
- CSV parsing, column detection, duplicate identification.
- AES-256-GCM encryption & decryption.
- Redis-backed distributed atomic rate limiting & inter-email delay windows.
- Slack notification fail-safe error isolation.
- Elasticsearch tenant-isolated indexing & query building.
- BullMQ queue deterministic job IDs & worker idempotent guards.
- PostgreSQL full-text search fallback.
- Supertest REST API integration.

---

## 17. API Endpoint Documentation

Refer to [API_CONTRACT.md](API_CONTRACT.md) for full request/response schemas, types, and codes.

Summary:
- **Auth:** `GET /api/v1/auth/google`, `GET /api/v1/auth/google/callback`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`.
- **Emails:** `POST /api/v1/emails/schedule`, `GET /api/v1/emails/scheduled`, `GET /api/v1/emails/sent`, `GET /api/v1/emails/:id`, `DELETE /api/v1/emails/:id`, `GET /api/v1/emails/search`.
- **Senders:** `GET /api/v1/senders`, `POST /api/v1/senders`, `PATCH /api/v1/senders/:id`, `DELETE /api/v1/senders/:id`, `POST /api/v1/senders/ethereal`.
- **Campaigns:** `GET /api/v1/campaigns`, `POST /api/v1/campaigns`, `GET /api/v1/campaigns/:id`.
- **Slack:** `GET /api/v1/slack/oauth`, `GET /api/v1/slack/callback`, `GET /api/v1/slack/status`, `POST /api/v1/slack/disconnect`.
- **CSV:** `POST /api/v1/recipients/upload`, `POST /api/v1/recipients/validate`.
- **Dashboard:** `GET /api/v1/dashboard/stats`, `GET /api/v1/dashboard/activity`.
- **Health:** `GET /api/v1/health`.
- **Bull Board:** `GET /admin/queues`.

---

## 18. Scheduling Workflow

1. Client sends request to `POST /api/v1/emails/schedule`.
2. Zod validates the payload; JWT middleware verifies tenant authenticity.
3. Database creates `Email` record in PostgreSQL with status `SCHEDULED` (or `DRAFT` if not scheduled).
4. A deterministic delayed BullMQ job is enqueued with delay = `max(0, scheduledAt - now)`.
5. Newly created email is indexed in Elasticsearch.
6. When due, BullMQ worker picks up job:
   - Validates email is still `SCHEDULED` (not `CANCELLED`).
   - Checks Redis atomic sender rate limit.
   - Updates status to `PROCESSING`.
   - Sends email via Nodemailer SMTP.
   - Updates PostgreSQL status to `SENT` with `sentAt` and `etherealPreviewUrl`.
   - Updates Elasticsearch document.
   - Dispatches Slack notification to user.

---

## 19. Restart Recovery Strategy

- PostgreSQL is the permanent source of truth; Redis/BullMQ is the execution queue.
- On startup, `reconcileScheduledEmails()` runs:
  1. Identifies any stranded `PROCESSING` records (from an ungraceful crash) and resets them back to `SCHEDULED`.
  2. Queries all `SCHEDULED` records from PostgreSQL and checks if their deterministic job ID (`email-job-<emailId>`) exists in BullMQ.
  3. Re-enqueues any missing jobs with the remaining delay without duplicating existing jobs.
- No cron jobs or recurring polling loops are used.

---

## 20. Idempotency Trade-offs

- Jobs utilize deterministic BullMQ IDs (`email-job-<emailId>`).
- Database employs unique constraints on `idempotencyKey` and `queueJobId`.
- **SMTP Ambiguity Trade-off:** SMTP does not provide transactional two-phase commit. If a worker process crashes after the SMTP server accepted the email but before the database write finishes, an ambiguity exists.
  - ReachInbox records an explicit `PROCESSING` state with `retryCount`.
  - Recovery does not automatically blind-retry emails that reached `PROCESSING` without human inspection or timeout verification to prevent accidental double-sending to prospects.

---

## 21. Worker Concurrency

- Concurrency is configurable via `EMAIL_WORKER_CONCURRENCY` (default: `5`).
- Multiple workers run concurrently without violating per-sender limits due to atomic Redis operations.

---

## 22. Delay Enforcement

- A minimum delay between successive emails from the same sender (e.g. 2 seconds) is enforced using Redis atomic key `ratelimit:sender:delay:<senderId>`.
- When an email sends, a temporary key with `EX` TTL is set. Any concurrent worker picking up an email for that sender delays the job by the remaining TTL using BullMQ `job.moveToDelayed()`, avoiding local in-memory timers.

---

## 23. Hourly Rate Limiting

- Sender-specific hourly limits are tracked in Redis using atomic `INCR` on key `ratelimit:sender:<senderId>:<YYYYMMDDHH>` with 3700-second TTL.
- If a sender reaches their hourly limit:
  1. The job is **not dropped or failed**.
  2. The job is rescheduled to the start of the next hour window via `job.moveToDelayed(now + msUntilNextHour)`.
  3. Status in PostgreSQL remains `SCHEDULED`.

---

## 24. Slack Notifications

- When rate limits are reached, the worker dispatches a Slack alert using `@slack/web-api`.
- Deduplication is enforced via Redis key `ratelimit:slack_notified:<senderId>:<hourKey>` so Slack is alerted **only once per sender per hour window**.
- Slack failures never disrupt email delivery (wrapped in non-blocking try-catch).

---

## 25. Elasticsearch Indexing

- Field structure: `emailId`, `userId`, `campaignId`, `senderEmail`, `recipient`, `subject`, `body`, `status`, `scheduledAt`, `sentAt`, `createdAt`.
- Multi-field search (`subject^2`, `body`, `recipient`, `senderEmail`) with automatic fuzziness.
- Strictly isolated to the authenticated `userId`.
- If Elasticsearch is temporarily unreachable, search queries automatically fall back to PostgreSQL parameterized ILIKE queries seamlessly.

---

## 26. Assumptions and Limitations

- **Ethereal Email**: Intended for testing and development. In production, configure custom SMTP or Amazon SES / SendGrid credentials in `Sender`.
- **Single Slack Workspace per User**: Users connect one active Slack workspace for alerts.
- **Clock Synchronization**: Assumes server host clocks are synchronized via NTP.
