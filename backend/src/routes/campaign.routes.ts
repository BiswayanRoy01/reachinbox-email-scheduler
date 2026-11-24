import { Router } from "express";
import { campaignController } from "../controllers/campaign.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { campaignSchema } from "../validators/index.js";

const router = Router();

router.use(authenticate);

router.get("/", campaignController.getCampaigns.bind(campaignController));
router.post("/", validateBody(campaignSchema), campaignController.createCampaign.bind(campaignController));
router.get("/:id", campaignController.getCampaign.bind(campaignController));

export default router;
