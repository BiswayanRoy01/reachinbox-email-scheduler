import { Response } from "express";
import { searchService } from "../services/search.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export class SearchController {
  public async searchEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await searchService.searchEmails(req.user!.id, req.query as any);
      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.meta
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const searchController = new SearchController();
