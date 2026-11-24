import { OAuth2Client } from "google-auth-library";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.callbackUrl
    );
  }

  /**
   * Generates Google OAuth Consent URL
   */
  public getAuthUrl(state?: string): string {
    return this.client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email"
      ],
      prompt: "consent",
      state
    });
  }

  /**
   * Exchanges authorization code for user profile
   */
  public async getUserFromCode(code: string): Promise<{
    googleId: string;
    email: string;
    name: string;
    profilePicture?: string;
  }> {
    try {
      const { tokens } = await this.client.getToken(code);
      this.client.setCredentials(tokens);

      if (!tokens.id_token) {
        throw new Error("No ID token returned by Google OAuth");
      }

      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: config.google.clientId
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new Error("Invalid user payload from Google ID token");
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split("@")[0],
        profilePicture: payload.picture
      };
    } catch (error: any) {
      logger.error("Error exchanging Google OAuth code:", { error: error.message });
      throw error;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
