import { Router } from "express";
import multer from "multer";
import { csvController } from "../controllers/csv.controller.js";
import { authenticate } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  }
});

const router = Router();

router.use(authenticate);

router.post("/upload", upload.single("file"), csvController.uploadCsv.bind(csvController));
router.post("/validate", csvController.validateRecipients.bind(csvController));

export default router;
