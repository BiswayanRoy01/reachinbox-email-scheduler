import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest, AuthenticatedUser } from "../types/index.js";

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.query && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication token missing. Please log in."
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        profilePicture: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found. Invalid or revoked session."
      });
      return;
    }

    req.user = user as AuthenticatedUser;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Session token expired. Please log in again."
      });
      return;
    }
    res.status(401).json({
      success: false,
      message: "Invalid authentication token."
    });
  }
}
