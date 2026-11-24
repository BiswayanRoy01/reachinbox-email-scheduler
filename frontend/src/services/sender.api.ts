import { api } from "./api";
import { Sender, ApiResponse } from "../types";

export interface CreateSenderInput {
  emailAddress: string;
  displayName: string;
  smtpHost: string;
  smtpPort?: number;
  smtpUsername: string;
  smtpPassword?: string;
  hourlyLimit?: number;
}

export const senderApi = {
  getSenders: async (): Promise<Sender[]> => {
    const response = await api.get<ApiResponse<Sender[]>>("/senders");
    return response.data.data;
  },

  getSender: async (id: string): Promise<Sender> => {
    const response = await api.get<ApiResponse<Sender>>(`/senders/${id}`);
    return response.data.data;
  },

  createSender: async (data: CreateSenderInput): Promise<Sender> => {
    const response = await api.post<ApiResponse<Sender>>("/senders", data);
    return response.data.data;
  },

  createEtherealSender: async (displayName = "Ethereal Test Sender"): Promise<Sender> => {
    const response = await api.post<ApiResponse<Sender>>("/senders/ethereal", { displayName });
    return response.data.data;
  },

  updateSender: async (id: string, data: Partial<CreateSenderInput>): Promise<Sender> => {
    const response = await api.put<ApiResponse<Sender>>(`/senders/${id}`, data);
    return response.data.data;
  },

  deleteSender: async (id: string): Promise<void> => {
    await api.delete(`/senders/${id}`);
  },

  verifySender: async (id: string): Promise<boolean> => {
    const response = await api.post<ApiResponse<{ verified: boolean }>>(`/senders/${id}/verify`);
    return response.data.data.verified;
  },
};
