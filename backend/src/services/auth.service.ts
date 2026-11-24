import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { config } from "../config/index.js";
import { googleAuthService } from "../integrations/google/auth.js";
import { logger } from "../utils/logger.js";

export class AuthService {
  /**
   * Generates a signed JWT token for a user
   */
  public generateToken(user: { id: string; email: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      config.jwt.secret,
      { expiresIn: "7d" }
    );
  }

  /**
   * Generates Google OAuth URL
   */
  public getGoogleAuthUrl(state?: string): string {
    return googleAuthService.getAuthUrl(state);
  }

  /**
   * Handles Google OAuth callback:
   * Finds or creates user record, then returns user + JWT token
   */
  public async handleGoogleCallback(code: string): Promise<{
    user: any;
    token: string;
  }> {
    const googleProfile = await googleAuthService.getUserFromCode(code);

    const user = await prisma.user.upsert({
      where: { googleId: googleProfile.googleId },
      update: {
        name: googleProfile.name,
        email: googleProfile.email,
        profilePicture: googleProfile.profilePicture
      },
      create: {
        googleId: googleProfile.googleId,
        email: googleProfile.email,
        name: googleProfile.name,
        profilePicture: googleProfile.profilePicture
      }
    });

    logger.info(`User authenticated successfully via Google: ${user.email} (${user.id})`);
    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * Dev/Test helper: authenticate or register a test user directly
   */
  public async devLogin(email: string, name = "Dev User"): Promise<{ user: any; token: string }> {
    if (config.env === "production" && process.env.ENABLE_DEV_LOGIN !== "true") {
      throw new Error("Dev login is disabled in production");
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        email,
        name,
        googleId: `dev-google-id-${Date.now()}`
      }
    });

    const token = this.generateToken(user);
    return { user, token };
  }
}

export const authService = new AuthService();
