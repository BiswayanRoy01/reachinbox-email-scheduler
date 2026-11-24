import { describe, it, expect } from "vitest";
import { csvService } from "../src/services/csv.service.js";

describe("CSV Recipient Parser & Validator", () => {
  it("should parse valid CSV with default email column", () => {
    const csvContent = `email,name,company
john.doe@example.com,John Doe,Acme Inc
jane.smith@example.com,Jane Smith,TechCorp
`;
    const result = csvService.parseAndValidate(Buffer.from(csvContent));

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
    expect(result.validRecipients[0].email).toBe("john.doe@example.com");
    expect(result.validRecipients[0].metadata.name).toBe("John Doe");
    expect(result.validRecipients[1].email).toBe("jane.smith@example.com");
  });

  it("should detect invalid email addresses and duplicates", () => {
    const csvContent = `email,name
valid1@example.com,User 1
not-an-email,Bad User
valid1@example.com,Duplicate User
another.valid@domain.org,User 3
`;
    const result = csvService.parseAndValidate(Buffer.from(csvContent));

    expect(result.totalRows).toBe(4);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(2);
    expect(result.duplicateCount).toBe(1);

    expect(result.invalidRows).toContainEqual(
      expect.objectContaining({
        emailCandidate: "not-an-email",
        reason: "Invalid email address format"
      })
    );

    expect(result.invalidRows).toContainEqual(
      expect.objectContaining({
        emailCandidate: "valid1@example.com",
        reason: "Duplicate email address in file"
      })
    );
  });

  it("should handle custom email column names case-insensitively", () => {
    const csvContent = `Recipient_Email,FirstName
test.user@company.com,Test
`;
    const result = csvService.parseAndValidate(Buffer.from(csvContent), "Recipient_Email");

    expect(result.validCount).toBe(1);
    expect(result.validRecipients[0].email).toBe("test.user@company.com");
  });

  it("should return empty result for empty CSV", () => {
    const result = csvService.parseAndValidate(Buffer.from(""));
    expect(result.totalRows).toBe(0);
    expect(result.validCount).toBe(0);
  });
});
