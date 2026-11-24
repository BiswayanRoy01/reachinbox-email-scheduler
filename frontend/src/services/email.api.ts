import { api } from "./api";
import {
  Email,
  ScheduleEmailRequest,
  ScheduleEmailResponse,
  BulkEmailCreateRequest,
  PaginatedResponse,
  SearchEmailsParams,
  ApiResponse,
} from "../types";

export const emailApi = {
  getScheduledEmails: async (page = 1, limit = 20): Promise<PaginatedResponse<Email>> => {
    const response = await api.get<PaginatedResponse<Email>>("/emails/scheduled", {
      params: { page, limit },
    });
    return response.data;
  },

  getSentEmails: async (page = 1, limit = 20): Promise<PaginatedResponse<Email>> => {
    const response = await api.get<PaginatedResponse<Email>>("/emails/sent", {
      params: { page, limit },
    });
    return response.data;
  },

  getEmailById: async (id: string): Promise<Email> => {
    const response = await api.get<ApiResponse<Email>>(`/emails/${id}`);
    return response.data.data;
  },

  scheduleEmail: async (data: ScheduleEmailRequest): Promise<ScheduleEmailResponse> => {
    const response = await api.post<ScheduleEmailResponse>("/emails/schedule", data);
    return response.data;
  },

  bulkCreateEmails: async (data: BulkEmailCreateRequest): Promise<any> => {
    const response = await api.post<ApiResponse<any>>("/emails/bulk", data);
    return response.data;
  },

  sendImmediately: async (id: string): Promise<Email> => {
    const response = await api.post<ApiResponse<Email>>(`/emails/${id}/send`);
    return response.data.data;
  },

  cancelScheduledEmail: async (id: string): Promise<Email> => {
    const response = await api.post<ApiResponse<Email>>(`/emails/${id}/cancel`);
    return response.data.data;
  },

  retryFailedEmail: async (id: string): Promise<Email> => {
    const response = await api.post<ApiResponse<Email>>(`/emails/${id}/retry`);
    return response.data.data;
  },

  deleteEmail: async (id: string): Promise<void> => {
    await api.delete(`/emails/${id}`);
  },

  searchEmails: async (params: SearchEmailsParams): Promise<PaginatedResponse<Email>> => {
    const response = await api.get<PaginatedResponse<Email>>("/emails/search", {
      params,
    });
    return response.data;
  },
};
