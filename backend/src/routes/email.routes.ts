import { Router } from "express";
import { emailController } from "../controllers/email.controller.js";
import { searchController } from "../controllers/search.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { createEmailSchema, updateEmailSchema, bulkEmailCreateSchema, emailSearchSchema } from "../validators/index.js";

const router = Router();

router.use(authenticate);

// Search endpoint (placed before :id to prevent collision)
router.get("/search", validateQuery(emailSearchSchema), searchController.searchEmails.bind(searchController));
router.post("/sync-elasticsearch", emailController.syncElasticsearch.bind(emailController));

// Scheduled and Sent dedicated convenience endpoints
router.get("/scheduled", emailController.getScheduledEmails.bind(emailController));
router.get("/sent", emailController.getSentEmails.bind(emailController));

// Email listing & creation
router.get("/", emailController.getEmails.bind(emailController));
router.post("/schedule", validateBody(createEmailSchema), emailController.createEmail.bind(emailController));
router.post("/", validateBody(createEmailSchema), emailController.createEmail.bind(emailController));
router.post("/bulk", validateBody(bulkEmailCreateSchema), emailController.bulkCreate.bind(emailController));

// Email item endpoints
router.get("/:id", emailController.getEmail.bind(emailController));
router.put("/:id", validateBody(updateEmailSchema), emailController.updateEmail.bind(emailController));
router.delete("/:id", emailController.deleteEmail.bind(emailController));
router.post("/:id/send", emailController.sendEmailImmediately.bind(emailController));
router.post("/:id/cancel", emailController.cancelEmail.bind(emailController));
router.post("/:id/retry", emailController.retryEmail.bind(emailController));

export default router;
