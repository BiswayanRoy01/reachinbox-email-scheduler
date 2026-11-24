import { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { AuthenticatedRequest } from "../types/index.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export class AuthController {
  /**
   * GET /api/v1/auth/google
   * Redirects user to Google OAuth consent page
   */
  public googleRedirect(req: Request, res: Response): void {
    const state = (req.query.state as string) || undefined;
    const url = authService.getGoogleAuthUrl(state);
    res.redirect(url);
  }

  /**
   * GET /api/v1/auth/google/callback
   * Processes OAuth callback from Google
   */
  public async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).json({
          success: false,
          message: "Authorization code missing from Google callback"
        });
        return;
      }

      const { user, token } = await authService.handleGoogleCallback(code);

      // Set HTTP-only secure cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: config.env === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // If frontend URL provided, redirect with token
      if (config.frontendUrl) {
        res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
        return;
      }

      res.status(200).json({
        success: true,
        message: "Authentication successful",
        data: { user, token }
      });
    } catch (error: any) {
      logger.error("Error in googleCallback:", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to authenticate with Google",
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user
   */
  public getCurrentUser(req: AuthenticatedRequest, res: Response): void {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  }

  /**
   * POST /api/v1/auth/logout
   * Clears session cookie
   */
  public logout(req: Request, res: Response): void {
    res.clearCookie("token", {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: config.env === "production" ? "none" : "lax"
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  }

  /**
   * POST /api/v1/auth/dev-login
   * For local testing and development
   */
  public async devLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, name } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: "Email is required" });
        return;
      }

      const { user, token } = await authService.devLogin(email, name);

      res.cookie("token", token, {
        httpOnly: true,
        secure: config.env === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: "Development login successful",
        data: { user, token }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

export const authController = new AuthController();
