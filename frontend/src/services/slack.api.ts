import { api } from "./api";
import { SlackStatus, ApiResponse } from "../types";

export const slackApi = {
  getAuthUrl: (): string => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
    const token = localStorage.getItem("reachinbox_token");
    return `${baseUrl}/slack/oauth${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },

  getStatus: async (): Promise<SlackStatus> => {
    const response = await api.get<ApiResponse<SlackStatus>>("/slack/status");
    return response.data.data;
  },

  disconnect: async (): Promise<void> => {
    await api.post("/slack/disconnect");
  },
};
