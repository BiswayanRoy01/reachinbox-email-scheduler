import { api } from "./api";
import { DashboardStats, DashboardActivity, ApiResponse } from "../types";

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<ApiResponse<DashboardStats>>("/dashboard/stats");
    return response.data.data;
  },

  getActivity: async (limit = 15): Promise<DashboardActivity> => {
    const response = await api.get<ApiResponse<DashboardActivity>>("/dashboard/activity", {
      params: { limit },
    });
    return response.data.data;
  },
};
