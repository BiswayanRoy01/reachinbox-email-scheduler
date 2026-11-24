import { api } from "./api";
import { User, ApiResponse } from "../types";

export const authApi = {
  getGoogleAuthUrl: (): string => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
    return `${baseUrl}/auth/google`;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>("/auth/me");
    return response.data.data.user;
  },

  devLogin: async (email: string, name?: string): Promise<{ user: User; token: string }> => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>("/auth/dev-login", {
      email,
      name,
    });
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("reachinbox_token");
    }
  },
};
