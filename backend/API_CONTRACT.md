# ReachInbox Email Scheduler — API Contract & Specification

**Base URL:** `/api/v1`  
**Protocol:** HTTP/1.1 & HTTP/2 over TLS (Production)  
**Data Format:** JSON (`application/json`) / Multipart Form (`multipart/form-data` for CSV uploads)  
**Date Format:** ISO 8601 UTC string (e.g., `2026-11-24T14:30:00.000Z`)  
**Authentication Scheme:** Bearer JWT in `Authorization: Bearer <token>` header OR HTTP-only cookie named `token`.

---

## Table of Contents
1. [Shared TypeScript Interfaces](#1-shared-typescript-interfaces)
2. [Global Standards & Conventions](#2-global-standards--conventions)
3. [Data Types & Enums](#3-data-types--enums)
4. [Authentication APIs](#4-authentication-apis)
5. [Sender Management APIs](#5-sender-management-apis)
6. [Email Scheduling & Management APIs](#6-email-scheduling--management-apis)
7. [Email Search API (Elasticsearch with PostgreSQL Fallback)](#7-email-search-api-elasticsearch-with-postgresql-fallback)
8. [Campaign Management APIs](#8-campaign-management-apis)
9. [CSV Recipient Upload & Validation APIs](#9-csv-recipient-upload--validation-apis)
10. [Slack OAuth & Rate-Limit Alert APIs](#10-slack-oauth--rate-limit-alert-apis)
11. [Dashboard & Analytics APIs](#11-dashboard--analytics-apis)
12. [System Health & Monitoring APIs](#12-system-health--monitoring-apis)

---

## 1. Shared TypeScript Interfaces

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  profilePicture?: string | null;
  googleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  userId: string;
  emailAddress: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  isActive: boolean;
  hourlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  senderId?: string | null;
  name: string;
  subject?: string | null;
  body?: string | null;
  startTime?: string | null;
  delayBetweenEmails: number;
  hourlyLimit: number;
  status: "DRAFT" | "SCHEDULED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
}

export interface Email {
  id: string;
  campaignId?: string | null;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  status: "DRAFT" | "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
  idempotencyKey?: string | null;
  failureReason?: string | null;
  errorMessage?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEmailRequest {
  senderId: string;
  campaignId?: string | null;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt?: string | null;
  sendImmediately?: boolean;
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content?: string; // base64
    path?: string;
    contentType?: string;
  }>;
}

export interface ScheduleEmailResponse {
  success: boolean;
  message: string;
  data: Email[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    engine?: "elasticsearch" | "postgresql";
  };
}

export interface SlackConnection {
  id: string;
  userId: string;
  teamId: string;
  teamName?: string | null;
  channelName?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

---

## 2. Global Standards & Conventions

### Response Format
```json
{
  "success": true,
  "message": "Operation description",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false,
    "engine": "elasticsearch"
  }
}
```

---

## 3. Data Types & Enums

### EmailStatus
`DRAFT` | `SCHEDULED` | `PROCESSING` | `SENT` | `FAILED` | `CANCELLED`

### CampaignStatus
`DRAFT` | `SCHEDULED` | `PROCESSING` | `COMPLETED` | `CANCELLED`

---

## 4. Authentication APIs

### 4.1 Initiate Google OAuth
- **Endpoint:** `GET /api/v1/auth/google`
- **Auth:** Public
- **Query Parameters:** `state` (optional)
- **Behavior:** 302 Redirect to `accounts.google.com`.

### 4.2 Google OAuth Callback
- **Endpoint:** `GET /api/v1/auth/google/callback`
- **Auth:** Public
- **Query Parameters:** `code` (required), `state` (optional)
- **Behavior:** Sets HTTP-only `token` cookie and redirects to `${FRONTEND_URL}/auth/callback?token=<JWT>`.

### 4.3 Current Authenticated User Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Bearer Token / Cookie required
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "18f9db56-2db1-4c4f-9556-3bb8c7b4162e",
      "name": "Alex Outreach",
      "email": "alex@reachinbox.ai",
      "googleId": "1049285028401",
      "profilePicture": "https://lh3.googleusercontent.com/..."
    }
  }
}
```

### 4.4 Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Public / Authenticated
- **Behavior:** Clears session cookie.

---

## 5. Sender Management APIs

### 5.1 List Senders
- **Endpoint:** `GET /api/v1/senders`
- **Auth:** Bearer Token required
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "7bc26e99-4c17-48f8-b3d4-b49dca0db51a",
      "emailAddress": "alex@reachinbox.ai",
      "displayName": "Alex from ReachInbox",
      "smtpHost": "smtp.ethereal.email",
      "smtpPort": 587,
      "smtpUsername": "alex@reachinbox.ai",
      "isActive": true,
      "hourlyLimit": 100,
      "createdAt": "2026-11-24T12:00:00.000Z"
    }
  ]
}
```

### 5.2 Create Sender
- **Endpoint:** `POST /api/v1/senders`
- **Auth:** Bearer Token required
- **Request Body:**
```json
{
  "emailAddress": "sender@domain.com",
  "displayName": "Sender Name",
  "smtpHost": "smtp.domain.com",
  "smtpPort": 587,
  "smtpUsername": "sender@domain.com",
  "smtpPassword": "SecretPassword123",
  "hourlyLimit": 100
}
```
- **Response (201 Created):** Returns created sender (password encrypted with AES-256-GCM and excluded from response).

### 5.3 Auto-Provision Ethereal Test Sender
- **Endpoint:** `POST /api/v1/senders/ethereal`
- **Auth:** Bearer Token required
- **Response (201 Created):** Creates an ephemeral Ethereal test account ready for sending with test preview links.

### 5.4 Update Sender
- **Endpoint:** `PUT /api/v1/senders/:id` or `PATCH /api/v1/senders/:id`
- **Auth:** Bearer Token required

### 5.5 Delete Sender
- **Endpoint:** `DELETE /api/v1/senders/:id`
- **Auth:** Bearer Token required

---

## 6. Email Scheduling & Management APIs

### 6.1 Schedule Email(s)
- **Endpoint:** `POST /api/v1/emails/schedule` (or `POST /api/v1/emails`)
- **Auth:** Bearer Token required
- **Request Body:**
```json
{
  "senderId": "7bc26e99-4c17-48f8-b3d4-b49dca0db51a",
  "campaignId": "f2a1b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
  "recipients": ["client1@domain.com", "client2@domain.com"],
  "subject": "Introductory Consultation",
  "body": "<h1>Hello!</h1><p>We'd love to connect...</p>",
  "scheduledAt": "2026-11-25T14:00:00.000Z",
  "sendImmediately": false,
  "idempotencyKey": "req-uuid-12345"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully scheduled/created 2 email(s)",
  "data": [
    {
      "id": "email-uuid-1",
      "recipient": "client1@domain.com",
      "status": "SCHEDULED",
      "scheduledAt": "2026-11-25T14:00:00.000Z",
      "queueJobId": "email-job-email-uuid-1"
    }
  ]
}
```

### 6.2 View Scheduled Emails
- **Endpoint:** `GET /api/v1/emails/scheduled`
- **Auth:** Bearer Token required
- **Response (200 OK):** Paginated list of emails with `status = SCHEDULED`.

### 6.3 View Sent Emails
- **Endpoint:** `GET /api/v1/emails/sent`
- **Auth:** Bearer Token required
- **Response (200 OK):** Paginated list of emails with `status = SENT`.

### 6.4 Get Email Details
- **Endpoint:** `GET /api/v1/emails/:id`
- **Auth:** Bearer Token required
- **Response (200 OK):** Detailed email with live queue state (`queueInfo`) and `etherealPreviewUrl`.

### 6.5 Cancel Scheduled Email
- **Endpoint:** `POST /api/v1/emails/:id/cancel`
- **Auth:** Bearer Token required

### 6.6 Retry Failed Email
- **Endpoint:** `POST /api/v1/emails/:id/retry`
- **Auth:** Bearer Token required

### 6.7 Delete Email
- **Endpoint:** `DELETE /api/v1/emails/:id`
- **Auth:** Bearer Token required

---

## 7. Email Search API (Elasticsearch with PostgreSQL Fallback)

### 7.1 Search Emails
- **Endpoint:** `GET /api/v1/emails/search`
- **Auth:** Bearer Token required
- **Query Parameters:**
  - `q`: Global full-text search string (queries `subject^2`, `body`, `recipient`, `senderEmail` in Elasticsearch with fuzziness).
  - `recipient`: Filter by recipient email.
  - `sender`: Filter by sender email/name.
  - `subject`: Filter by subject text.
  - `body`: Filter by body text.
  - `status`: `DRAFT` | `SCHEDULED` | `PROCESSING` | `SENT` | `FAILED` | `CANCELLED`.
  - `campaignId`: UUID.
  - `startDate`: ISO 8601 string.
  - `endDate`: ISO 8601 string.
  - `page`: default 1.
  - `limit`: default 20.
  - `sortBy`: `createdAt` | `scheduledAt` | `sentAt` | `recipient` | `subject`.
  - `sortOrder`: `asc` | `desc`.
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "email-uuid",
      "recipient": "prospect@example.com",
      "subject": "Follow-up",
      "status": "SENT",
      "sentAt": "2026-11-24T13:00:00.000Z",
      "etherealPreviewUrl": "https://ethereal.email/message/...",
      "sender": {
        "emailAddress": "alex@reachinbox.ai",
        "displayName": "Alex"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false,
    "engine": "elasticsearch"
  }
}
```

---

## 8. Campaign Management APIs

### 8.1 List Campaigns
- **Endpoint:** `GET /api/v1/campaigns`
- **Auth:** Bearer Token required

### 8.2 Create Campaign
- **Endpoint:** `POST /api/v1/campaigns`
- **Auth:** Bearer Token required
- **Request Body:**
```json
{
  "name": "Q4 Prospecting",
  "senderId": "sender-uuid",
  "subject": "Special Offer",
  "body": "<p>Hello from ReachInbox</p>",
  "recipients": ["lead1@domain.com", "lead2@domain.com"],
  "scheduledAt": "2026-11-25T10:00:00.000Z"
}
```

### 8.3 Get Campaign Details
- **Endpoint:** `GET /api/v1/campaigns/:id`
- **Auth:** Bearer Token required

---

## 9. CSV Recipient Upload & Validation APIs

### 9.1 Upload and Validate CSV File
- **Endpoint:** `POST /api/v1/recipients/upload`
- **Auth:** Bearer Token required
- **Content-Type:** `multipart/form-data`
- **Form Data:**
  - `file`: CSV file (up to 10MB)
  - `emailColumn`: optional column name (default: "email")
- **Response (200 OK):** Returns parsed columns, valid recipients, duplicate count, and invalid rows with reasons.

### 9.2 Validate Recipient Objects
- **Endpoint:** `POST /api/v1/recipients/validate`
- **Auth:** Bearer Token required

---

## 10. Slack OAuth & Rate-Limit Alert APIs

### 10.1 Initiate Slack OAuth
- **Endpoint:** `GET /api/v1/slack/oauth` (or `/api/v1/slack/connect`)
- **Auth:** Bearer Token required
- **Behavior:** 302 Redirect to `slack.com/oauth/v2/authorize`.

### 10.2 Slack OAuth Callback
- **Endpoint:** `GET /api/v1/slack/callback`
- **Auth:** Public / Cookie

### 10.3 Slack Status
- **Endpoint:** `GET /api/v1/slack/status`
- **Auth:** Bearer Token required

### 10.4 Disconnect Slack
- **Endpoint:** `POST /api/v1/slack/disconnect` (or `DELETE /api/v1/slack/disconnect`)
- **Auth:** Bearer Token required

### 10.5 Real-Time Rate-Limit Alert Format (Worker Triggered)
When a sender reaches their hourly rate limit, a Slack alert is automatically dispatched:
```text
⚠️ Email rate limit reached.

Sender: oliver@domain.com
Hourly limit: 100
Campaign: Follow-up Campaign

Pending emails have been rescheduled to the next available sending window.
```

---

## 11. Dashboard & Analytics APIs

### 11.1 Statistics
- **Endpoint:** `GET /api/v1/dashboard/stats`
- **Auth:** Bearer Token required

### 11.2 Activity Timeline
- **Endpoint:** `GET /api/v1/dashboard/activity`
- **Auth:** Bearer Token required

---

## 12. System Health & Monitoring APIs

### 12.1 Health Check
- **Endpoint:** `GET /api/v1/health`
- **Auth:** Public
- **Response (200 OK / 503 Service Unavailable):**
```json
{
  "status": "UP",
  "timestamp": "2026-11-24T14:50:00.000Z",
  "uptimeSeconds": 1820,
  "memoryUsage": { ... },
  "services": {
    "database": "CONNECTED",
    "redis": "CONNECTED",
    "elasticsearch": "CONNECTED"
  }
}
```

### 12.2 Bull Board Queue Dashboard
- **Endpoint:** `GET /admin/queues`
- **Auth:** HTTP Basic Auth (`BULL_BOARD_USERNAME` / `BULL_BOARD_PASSWORD`)
- **UI:** Real-time BullMQ job inspection for active, waiting, delayed, completed, and failed jobs.
