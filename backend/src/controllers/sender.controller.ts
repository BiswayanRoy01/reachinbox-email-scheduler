import { Response } from "express";
import { senderService } from "../services/sender.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export class SenderController {
  public async getSenders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const senders = await senderService.getSenders(req.user!.id);
      res.status(200).json({ success: true, data: senders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getSender(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const sender = await senderService.getSenderById(id, req.user!.id);
      if (!sender) {
        res.status(404).json({ success: false, message: "Sender not found" });
        return;
      }
      res.status(200).json({ success: true, data: sender });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async createSender(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sender = await senderService.createSender(req.user!.id, req.body);
      res.status(201).json({ success: true, message: "Sender created successfully", data: sender });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async createEtherealSender(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const displayName = req.body?.displayName && req.body.displayName !== "Ethereal Test Sender" ? req.body.displayName : undefined;
      const sender = await senderService.createEtherealSender(req.user!.id, displayName);
      res.status(201).json({
        success: true,
        message: "Ethereal test sender provisioned successfully",
        data: sender
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async updateSender(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const sender = await senderService.updateSender(id, req.user!.id, req.body);
      res.status(200).json({ success: true, message: "Sender updated successfully", data: sender });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async deleteSender(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await senderService.deleteSender(id, req.user!.id);
      res.status(200).json({ success: true, message: "Sender deleted or deactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async verifySender(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const isValid = await senderService.verifySender(id, req.user!.id);
      res.status(200).json({ success: true, message: "SMTP configuration verified successfully", data: { verified: isValid } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export const senderController = new SenderController();
