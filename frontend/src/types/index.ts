export type EmailStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

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
  status: CampaignStatus;
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAttachment {
  filename: string;
  content?: string; // Base64
  path?: string;
  contentType?: string;
  size?: number;
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
  status: EmailStatus;
  idempotencyKey?: string | null;
  failureReason?: string | null;
  errorMessage?: string | null;
  etherealPreviewUrl?: string | null;
  attachments?: EmailAttachment[];
  sender?: {
    id?: string;
    emailAddress: string;
    displayName: string;
  };
  campaign?: {
    id: string;
    name: string;
    status: CampaignStatus;
  };
  queueInfo?: {
    jobId?: string;
    state?: string;
    attemptsMade?: number;
    delay?: number;
    timestamp?: number;
  } | null;
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
  attachments?: EmailAttachment[];
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}

export interface BulkEmailCreateRequest {
  senderId: string;
  campaignId?: string | null;
  campaignName?: string;
  subject: string;
  body: string;
  recipients: Array<{
    email: string;
    metadata?: Record<string, any>;
  }>;
  scheduledAt?: string | null;
  sendImmediately?: boolean;
  attachments?: EmailAttachment[];
}

export interface ScheduleEmailResponse {
  success: boolean;
  message: string;
  data: Email[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  engine?: "elasticsearch" | "postgresql";
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface SlackStatus {
  connected: boolean;
  teamId?: string;
  teamName?: string | null;
  channelName?: string | null;
  updatedAt?: string;
}

export interface DashboardStats {
  emails: {
    total: number;
    draft: number;
    scheduled: number;
    processing: number;
    sent: number;
    failed: number;
    cancelled: number;
    deliveryRate: number;
  };
  campaigns: {
    total: number;
  };
  senders: {
    total: number;
    active: number;
  };
}

export interface DashboardActivity {
  recentActivity: Email[];
  timeline: Array<{
    date: string;
    sent: number;
    failed: number;
    scheduled: number;
  }>;
}

export interface SearchEmailsParams {
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

export interface CsvUploadResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  columns: string[];
  valid: Array<{ email: string; [key: string]: any }>;
  invalid: Array<{ row: number; item: any; reason: string }>;
}
