import { Router } from "express";
import { slackController } from "../controllers/slack.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/oauth", authenticate, slackController.connect.bind(slackController));
router.get("/connect", authenticate, slackController.connect.bind(slackController));
router.get("/callback", slackController.callback.bind(slackController));
router.get("/status", authenticate, slackController.getStatus.bind(slackController));
router.post("/disconnect", authenticate, slackController.disconnect.bind(slackController));
router.delete("/disconnect", authenticate, slackController.disconnect.bind(slackController));

export default router;
