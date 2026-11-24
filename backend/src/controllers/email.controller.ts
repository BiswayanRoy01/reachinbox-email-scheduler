import { Response } from "express";
import { emailService } from "../services/email.service.js";
import { elasticsearchService } from "../integrations/elasticsearch/elasticsearch.service.js";
import { AuthenticatedRequest } from "../types/index.js";
import { EmailStatus } from "@prisma/client";

export class EmailController {
  public async syncElasticsearch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const count = await elasticsearchService.syncPostgresToElasticsearch();
      res.status(200).json({
        success: true,
        message: `Successfully synchronized ${count} email(s) into Elasticsearch index`,
        data: { syncedCount: count }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: `Elasticsearch synchronization failed: ${error.message}`
      });
    }
  }

  public async getEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = req.query.status as EmailStatus | undefined;
      const campaignId = req.query.campaignId as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await emailService.getEmails(req.user!.id, {
        status,
        campaignId,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.meta
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getScheduledEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await emailService.getEmails(req.user!.id, {
        status: "SCHEDULED",
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.meta
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getSentEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await emailService.getEmails(req.user!.id, {
        status: "SENT",
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.meta
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const email = await emailService.getEmailById(id, req.user!.id);
      if (!email) {
        res.status(404).json({ success: false, message: "Email not found" });
        return;
      }
      res.status(200).json({ success: true, data: email });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async createEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const emails = await emailService.createEmails(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: `Successfully scheduled/created ${emails.length} email(s)`,
        data: emails
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async updateEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const email = await emailService.updateEmail(id, req.user!.id, req.body);
      res.status(200).json({ success: true, message: "Email updated successfully", data: email });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async deleteEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await emailService.deleteEmail(id, req.user!.id);
      res.status(200).json({ success: true, message: "Email deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async sendEmailImmediately(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const email = await emailService.sendImmediately(id, req.user!.id);
      res.status(200).json({
        success: true,
        message: "Email queued for immediate sending",
        data: email
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async cancelEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const email = await emailService.cancelEmail(id, req.user!.id);
      res.status(200).json({
        success: true,
        message: "Email cancelled successfully",
        data: email
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async retryEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const email = await emailService.retryEmail(id, req.user!.id);
      res.status(200).json({
        success: true,
        message: "Email requeued for retry",
        data: email
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public async bulkCreate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await emailService.bulkCreateEmails(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: `Bulk scheduled ${result.createdCount} emails`,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export const emailController = new EmailController();
