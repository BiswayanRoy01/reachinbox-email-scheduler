import { Response } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export class DashboardController {
  public async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await dashboardService.getStats(req.user!.id);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const activity = await dashboardService.getActivity(req.user!.id, limit);
      res.status(200).json({ success: true, data: activity });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const dashboardController = new DashboardController();
