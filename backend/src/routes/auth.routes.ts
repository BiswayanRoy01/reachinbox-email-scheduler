import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/google", authController.googleRedirect.bind(authController));
router.get("/google/callback", authController.googleCallback.bind(authController));
router.get("/me", authenticate, authController.getCurrentUser.bind(authController));
router.post("/logout", authController.logout.bind(authController));

// Development authentication route (disabled in production)
router.post("/dev-login", authController.devLogin.bind(authController));

export default router;
