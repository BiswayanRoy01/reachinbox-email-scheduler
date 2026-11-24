import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  googleId: string;
  profilePicture?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface EmailJobData {
  emailId: string;
  userId: string;
  senderId: string;
  campaignId?: string | null;
  scheduledTime?: string;
  attempt?: number;
}

export interface EmailAttachment {
  filename: string;
  content?: string; // base64
  path?: string;
  contentType?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: any;
}
