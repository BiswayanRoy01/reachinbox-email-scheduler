import { Response } from "express";
import { slackService } from "../integrations/slack/slack.service.js";
import { AuthenticatedRequest } from "../types/index.js";
import { config } from "../config/index.js";

export class SlackController {
  public connect(req: AuthenticatedRequest, res: Response): void {
    const state = req.user!.id; // Use user ID as state to bind callback securely
    const url = slackService.getAuthUrl(state);
    res.redirect(url);
  }

  public async callback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code) {
        res.status(400).json({ success: false, message: "Code parameter missing" });
        return;
      }

      // If user is authenticated via cookie/header, use req.user.id, otherwise use state
      const userId = req.user?.id || state;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized state in callback" });
        return;
      }

      await slackService.handleOAuthCallback(code, userId);

      if (config.frontendUrl) {
        res.redirect(`${config.frontendUrl}/settings?slack=connected`);
        return;
      }

      res.status(200).json({
        success: true,
        message: "Slack workspace connected successfully"
      });
    } catch (error: any) {
      if (config.frontendUrl) {
        res.redirect(`${config.frontendUrl}/settings?slack=error&message=${encodeURIComponent(error.message)}`);
        return;
      }
      res.status(500).json({
        success: false,
        message: `Slack connection failed: ${error.message}`
      });
    }
  }

  public async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const connection = await slackService.getConnection(req.user!.id);
      res.status(200).json({
        success: true,
        data: {
          connected: Boolean(connection && connection.isActive),
          teamId: connection?.teamId,
          teamName: connection?.teamName,
          channelName: connection?.channelName,
          updatedAt: connection?.updatedAt
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async disconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await slackService.disconnect(req.user!.id);
      res.status(200).json({
        success: true,
        message: "Slack workspace disconnected successfully"
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const slackController = new SlackController();
