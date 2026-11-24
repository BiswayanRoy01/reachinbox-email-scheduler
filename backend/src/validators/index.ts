import { z } from "zod";

export const senderSchema = z.object({
  emailAddress: z.string().email("Invalid email address format"),
  displayName: z.string().min(1, "Display name is required").max(100),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  isActive: z.boolean().optional().default(true)
});

export const updateSenderSchema = senderSchema.partial();

export const attachmentSchema = z.object({
  filename: z.string().min(1),
  content: z.string().optional(), // Base64 encoded or raw string
  path: z.string().optional(),
  contentType: z.string().optional()
});

export const createEmailSchema = z.object({
  senderId: z.string().uuid("Invalid sender ID"),
  campaignId: z.string().uuid("Invalid campaign ID").optional().nullable(),
  recipients: z
    .array(z.string().email("Invalid recipient email address"))
    .min(1, "At least one recipient is required"),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Email body is required"),
  scheduledAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime({ offset: false }))
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return new Date(val).getTime() > Date.now() - 60000; // allow a slight clock skew
    }, "Scheduled time must be in the future"),
  sendImmediately: z.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).optional().default([])
});

export const updateEmailSchema = z.object({
  senderId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional().nullable(),
  recipient: z.string().email().optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  scheduledAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return new Date(val).getTime() > Date.now() - 60000;
    }, "Scheduled time must be in the future"),
  attachments: z.array(attachmentSchema).optional()
});

export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(150),
  senderId: z.string().uuid().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  recipients: z.array(z.string().email()).optional().default([]),
  scheduledAt: z.string().datetime().optional().nullable()
});

export const emailSearchSchema = z.object({
  q: z.string().optional(),
  recipient: z.string().optional(),
  sender: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PROCESSING", "SENT", "FAILED", "CANCELLED"]).optional(),
  campaignId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "scheduledAt", "sentAt", "recipient", "subject"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const csvValidateSchema = z.object({
  emailColumn: z.string().default("email"),
  nameColumn: z.string().optional(),
  hasHeader: z.boolean().default(true)
});

export const bulkEmailCreateSchema = z.object({
  senderId: z.string().uuid("Invalid sender ID"),
  campaignId: z.string().uuid("Invalid campaign ID").optional().nullable(),
  campaignName: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  recipients: z.array(
    z.object({
      email: z.string().email("Invalid email format"),
      metadata: z.record(z.any()).optional()
    })
  ).min(1, "At least one recipient is required"),
  scheduledAt: z.string().datetime().optional().nullable(),
  sendImmediately: z.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).optional().default([])
});
