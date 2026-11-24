import { Response } from "express";
import { csvService } from "../services/csv.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export class CsvController {
  /**
   * POST /api/v1/recipients/upload
   * Accepts multipart/form-data CSV file and returns columns and preview
   */
  public async uploadCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No CSV file uploaded" });
        return;
      }

      const emailColumn = (req.body.emailColumn as string) || "email";
      const result = csvService.parseAndValidate(req.file.buffer, emailColumn);

      res.status(200).json({
        success: true,
        message: `Parsed ${result.totalRows} rows: ${result.validCount} valid, ${result.invalidCount} invalid, ${result.duplicateCount} duplicates`,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: `Failed to parse CSV file: ${error.message}`
      });
    }
  }

  /**
   * POST /api/v1/recipients/validate
   * Validates raw JSON recipient payload against email syntax rules
   */
  public async validateRecipients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const recipients = req.body.recipients as Array<{ email?: string; [key: string]: any }>;
      if (!Array.isArray(recipients)) {
        res.status(400).json({ success: false, message: "Recipients must be an array" });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid: any[] = [];
      const invalid: any[] = [];
      const seen = new Set<string>();

      recipients.forEach((item, index) => {
        const rawEmail = item.email?.trim();
        if (!rawEmail) {
          invalid.push({ index, item, reason: "Missing email address" });
          return;
        }

        const emailLower = rawEmail.toLowerCase();
        if (!emailRegex.test(emailLower)) {
          invalid.push({ index, email: rawEmail, reason: "Invalid email syntax" });
          return;
        }

        if (seen.has(emailLower)) {
          invalid.push({ index, email: rawEmail, reason: "Duplicate recipient" });
          return;
        }

        seen.add(emailLower);
        valid.push(item);
      });

      res.status(200).json({
        success: true,
        data: {
          total: recipients.length,
          validCount: valid.length,
          invalidCount: invalid.length,
          valid,
          invalid
        }
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export const csvController = new CsvController();
