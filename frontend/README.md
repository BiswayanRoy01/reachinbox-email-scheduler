# ReachInbox.ai — Cold Email Outreach & Scheduling Frontend

A production-grade, highly responsive cold email outreach dashboard built for **ReachInbox.ai**. Closely engineered according to the Figma design specifications and integrated with the independently developed ReachInbox backend microservices.

---

## 1. Project Overview

ReachInbox is an AI-powered cold email scheduling and delivery tracking platform. The frontend allows authenticated users to:
- Authenticate seamlessly using Google OAuth or verified email sessions.
- Manage sender SMTP profiles (including instant 1-click ephemeral test provisioning via Ethereal).
- Parse and batch-import hundreds of recipient leads via CSV/TXT files with duplicate elimination and email syntax validation.
- Compose emails with a TipTap rich-text editor, file attachments, configurable delays between emails, and per-sender hourly dispatch limits.
- Schedule emails for future delivery with local timezone handling and quick preset slots ("Tomorrow 10:00 AM", etc.).
- Inspect Scheduled and Sent email lists with real-time status badges, Elasticsearch-powered fuzzy search, and live Ethereal inbox previews.
- Connect and monitor Slack workspace OAuth for automated rate-limit alerts.

---

## 2. Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Framework** | React 18 | Modern component architecture |
| **Build Tool** | Vite 6 | Lightning-fast HMR and bundling |
| **Language** | TypeScript 5 | End-to-end strict typing matching API contract |
| **Styling** | Tailwind CSS 3 | Exact Figma color palette, minimal shadows, soft green accents |
| **Routing** | React Router 6 | Protected client-side routing & deep linking |
| **HTTP Client** | Axios | Centralized client with automatic Bearer token and cookie handling |
| **Server State** | TanStack Query 5 | Real-time cache invalidation, polling, and optimistic updates |
| **Editor** | TipTap | Minimalist rich-text editor (Bold, Italic, Underline, Lists, Links) |
| **CSV Parsing** | PapaParse | Client-side CSV/TXT parsing with header autodetection |
| **Sanitizer** | DOMPurify | XSS-safe email body rendering |
| **Date Library** | date-fns 4 | Local timezone formatting and preset relative calculations |
| **Icons** | Lucide React | Clean, minimalist icons |
| **Notifications** | Sonner | Toast feedback for async operations |
| **Testing** | Vitest & React Testing Library | Component and logic test suite |

---

## 3. Design System & Figma Visual Characteristics

- **Palette**: Clean white card background (`#ffffff`), soft neutral canvas (`#f8fafc`), crisp slate text (`#1e293b`), and emerald accent highlights (`#059669` / `#10b981`).
- **Sidebar**: Sticky clean sidebar displaying the ReachInbox logo, authenticated user avatar with dropdown menu, "+ Compose New Email" primary action, and navigation pills with soft green active states (`bg-emerald-50 text-emerald-800`).
- **Header**: Live debounced search input, status and date filter popover, and manual cache refresh trigger.
- **Recipient Chips**: Green outline rounded chips (`border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-full px-3 py-1`) with individual dismissal buttons.
- **Send Later Panel**: Floating popover offering relative suggested times ("Tomorrow at 10:00 AM", etc.) and a custom datetime-local selector.

---

## 4. Application Routes

| Path | Access | Purpose |
|---|---|---|
| `/login` | Public | Authentication page (Google OAuth + Email login) |
| `/auth/callback` | Public | OAuth token exchange and session initialization |
| `/dashboard` | Protected | Redirects to `/dashboard/scheduled` |
| `/dashboard/scheduled` | Protected | List of queued emails with scheduled clock badges and actions |
| `/dashboard/sent` | Protected | List of delivered emails with timestamps and preview links |
| `/dashboard/compose` | Protected | Campaign composer with CSV parser, TipTap editor & Send Later |
| `/dashboard/emails/:id` | Protected | Detailed view with sanitized HTML body, queue info & attachments |
| `/settings` | Protected | Slack OAuth status, SMTP sender management & profile |

---

## 5. Folder Structure

```
reachinbox-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── EmptyState.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── compose/
│   │   │   ├── CsvUploaderModal.tsx
│   │   │   ├── RecipientChipInput.tsx
│   │   │   ├── RichTextEditor.tsx
│   │   │   └── SendLaterPopover.tsx
│   │   ├── email/
│   │   │   ├── EmailListSkeleton.tsx
│   │   │   └── EmailRow.tsx
│   │   └── layout/
│   │       ├── DashboardLayout.tsx
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── AuthCallback.tsx
│   │   ├── ComposeEmail.tsx
│   │   ├── EmailDetails.tsx
│   │   ├── Login.tsx
│   │   ├── ScheduledEmails.tsx
│   │   ├── SentEmails.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.api.ts
│   │   ├── dashboard.api.ts
│   │   ├── email.api.ts
│   │   ├── recipient.api.ts
│   │   ├── sender.api.ts
│   │   └── slack.api.ts
│   ├── test/
│   │   ├── auth.test.tsx
│   │   ├── csv.test.ts
│   │   ├── email-row.test.tsx
│   │   ├── format.test.ts
│   │   ├── recipient-input.test.tsx
│   │   └── setup.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── cn.ts
│   │   └── format.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── API_CONTRACT.md
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 6. Environment Configuration

Create a `.env` file in the project root:

```env
# Backend API Base URL
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 7. Installation & Development Commands

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```
The frontend starts on `http://localhost:3000`.

### Run unit and integration tests
```bash
npm run test
```

### Production build
```bash
npm run build
```

---

## 8. Backend API Integration & Architecture

The application communicates with the ReachInbox Express backend conforming strictly to `API_CONTRACT.md`:
- **Centralized Axios (`src/services/api.ts`)**: Configured with `withCredentials: true` and an interceptor that attaches `Authorization: Bearer <token>` from local storage. Catches `401 Unauthorized` responses and redirects to `/login`.
- **TanStack Query**: Server state is kept synchronized with automatic query cache invalidation on scheduling, cancellation, deletion, and retry actions.
- **Search (`/api/v1/emails/search`)**: Full-text queries on recipient, sender, subject, and email body using Elasticsearch (with PostgreSQL fallback).

---

## 9. Google OAuth & Authentication Flow

1. User clicks **"Continue with Google"** on `/login`.
2. Browser redirects to the backend endpoint `GET /api/v1/auth/google`.
3. Backend redirects to Google's consent screen.
4. User authorizes the application.
5. Google returns to `GET /api/v1/auth/google/callback`.
6. Backend sets the HTTP-only `token` cookie and redirects to `${FRONTEND_URL}/auth/callback?token=<JWT>`.
7. `AuthCallback` extracts the JWT, writes it to `localStorage`, and calls `GET /api/v1/auth/me`.
8. User profile details and avatar are displayed in the sidebar.

---

## 10. Slack OAuth & Rate-Limit Alerts

1. Navigate to **Settings** (`/settings`).
2. Click **"Connect Slack"** -> redirects to `GET /api/v1/slack/oauth`.
3. Slack OAuth consent opens; user authorizes ReachInbox for the workspace.
4. Backend stores the Slack credentials and redirects to `/settings?slack=connected`.
5. When any sender hits their hourly limit, backend BullMQ workers trigger a Slack webhook notification and automatically reschedule remaining messages.

---

## 11. CSV / Recipient Lead Ingestion

1. In the Compose view, click **"Upload CSV / TXT"**.
2. Drag and drop or browse any CSV or TXT file.
3. Client-side PapaParse automatically identifies the email column (supports `email`, `Email`, `Email Address`, `recipient`, etc.).
4. The system validates RFC-compliant email syntax, strips duplicates against existing recipients, and reports:
   - Total rows detected
   - Valid emails count
   - Duplicate & invalid counts
   - Preview of the parsed recipient list
5. Clicking **"Import Recipients"** populates rounded green chips in the "To" field.

---

## 12. Email Scheduling Workflow

1. Select a configured sender account (or click **"Auto-provision Ethereal Sender"** for instant sandbox testing).
2. Add one or multiple recipients manually or via CSV upload.
3. Enter subject line and compose body with rich formatting.
4. Set dispatch parameters:
   - **Delay between 2 emails**: spacing in seconds enforced by queue workers.
   - **Hourly Limit**: maximum emails dispatched per hour per sender account.
5. Click **"Schedule Time"** to open the Send Later popover and select a suggested time or custom slot.
6. Click **"Confirm & Schedule"** to send the payload to `POST /api/v1/emails/schedule`.
7. The email is enqueued in BullMQ and appears immediately under **Scheduled Emails** with its live countdown badge.
