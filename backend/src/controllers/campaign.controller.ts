import { Response } from "express";
import { campaignService } from "../services/campaign.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export class CampaignController {
  public async getCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const campaigns = await campaignService.getCampaigns(req.user!.id);
      res.status(200).json({ success: true, data: campaigns });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const campaign = await campaignService.getCampaignById(id, req.user!.id);
      if (!campaign) {
        res.status(404).json({ success: false, message: "Campaign not found" });
        return;
      }
      res.status(200).json({ success: true, data: campaign });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async createCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const campaign = await campaignService.createCampaign(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        data: campaign
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export const campaignController = new CampaignController();
