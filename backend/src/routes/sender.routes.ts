import { Router } from "express";
import { senderController } from "../controllers/sender.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { senderSchema, updateSenderSchema } from "../validators/index.js";

const router = Router();

router.use(authenticate);

router.get("/", senderController.getSenders.bind(senderController));
router.post("/", validateBody(senderSchema), senderController.createSender.bind(senderController));
router.post("/ethereal", senderController.createEtherealSender.bind(senderController));
router.get("/:id", senderController.getSender.bind(senderController));
router.put("/:id", validateBody(updateSenderSchema), senderController.updateSender.bind(senderController));
router.patch("/:id", validateBody(updateSenderSchema), senderController.updateSender.bind(senderController));
router.delete("/:id", senderController.deleteSender.bind(senderController));
router.post("/:id/verify", senderController.verifySender.bind(senderController));

export default router;
