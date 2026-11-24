import { parse } from "csv-parse/sync";

export interface CsvValidationResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  columns: string[];
  validRecipients: Array<{
    email: string;
    rowNumber: number;
    metadata: Record<string, any>;
  }>;
  invalidRows: Array<{
    rowNumber: number;
    emailCandidate?: string;
    reason: string;
    row: Record<string, any>;
  }>;
}

export class CsvService {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Parses CSV buffer and validates recipient rows
   */
  public parseAndValidate(
    fileBuffer: Buffer,
    emailColumnName = "email"
  ): CsvValidationResult {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Array<Record<string, string>>;

    if (!records || records.length === 0) {
      return {
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        duplicateCount: 0,
        columns: [],
        validRecipients: [],
        invalidRows: []
      };
    }

    const columns = Object.keys(records[0]);
    // Find actual email column key (case-insensitive check)
    const matchedCol = columns.find(
      (c) => c.toLowerCase() === emailColumnName.toLowerCase()
    ) || columns.find((c) => c.toLowerCase().includes("email"));

    const validRecipients: CsvValidationResult["validRecipients"] = [];
    const invalidRows: CsvValidationResult["invalidRows"] = [];
    const seenEmails = new Set<string>();
    let duplicateCount = 0;

    records.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header line
      const rawEmail = matchedCol ? row[matchedCol]?.trim() : undefined;

      if (!rawEmail) {
        invalidRows.push({
          rowNumber,
          reason: `Email column '${matchedCol || emailColumnName}' is empty or missing`,
          row
        });
        return;
      }

      const emailNormalized = rawEmail.toLowerCase();

      if (!this.emailRegex.test(emailNormalized)) {
        invalidRows.push({
          rowNumber,
          emailCandidate: rawEmail,
          reason: "Invalid email address format",
          row
        });
        return;
      }

      if (seenEmails.has(emailNormalized)) {
        duplicateCount++;
        invalidRows.push({
          rowNumber,
          emailCandidate: rawEmail,
          reason: "Duplicate email address in file",
          row
        });
        return;
      }

      seenEmails.add(emailNormalized);
      validRecipients.push({
        email: emailNormalized,
        rowNumber,
        metadata: row
      });
    });

    return {
      totalRows: records.length,
      validCount: validRecipients.length,
      invalidCount: invalidRows.length,
      duplicateCount,
      columns,
      validRecipients,
      invalidRows
    };
  }
}

export const csvService = new CsvService();
