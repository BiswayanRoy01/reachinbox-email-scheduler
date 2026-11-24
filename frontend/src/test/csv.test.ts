import { describe, it, expect } from "vitest";
import Papa from "papaparse";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRecipientsFromCsv(csvText: string, emailColumn = "email") {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as any[];

  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  const seen = new Set<string>();

  rows.forEach((row) => {
    const raw = row[emailColumn]?.trim();
    if (!raw) return;

    const lower = raw.toLowerCase();
    if (!EMAIL_REGEX.test(lower)) {
      invalid.push(raw);
      return;
    }

    if (seen.has(lower)) {
      duplicates++;
      return;
    }

    seen.add(lower);
    valid.push(lower);
  });

  return {
    total: valid.length + invalid.length + duplicates,
    valid,
    invalid,
    duplicates,
  };
}

describe("CSV and Recipient Parsing", () => {
  it("correctly extracts valid emails from standard CSV format", () => {
    const csvContent = `email,name\nuser1@example.com,User One\nuser2@example.com,User Two`;
    const result = parseRecipientsFromCsv(csvContent, "email");

    expect(result.valid).toEqual(["user1@example.com", "user2@example.com"]);
    expect(result.invalid).toHaveLength(0);
    expect(result.duplicates).toBe(0);
  });

  it("detects and separates invalid email addresses", () => {
    const csvContent = `email,name\nvalid@domain.com,Valid\ninvalid-address,Invalid\nanother@domain.org,Another`;
    const result = parseRecipientsFromCsv(csvContent, "email");

    expect(result.valid).toEqual(["valid@domain.com", "another@domain.org"]);
    expect(result.invalid).toEqual(["invalid-address"]);
  });

  it("handles duplicate email rows and removes duplicates", () => {
    const csvContent = `email\ndup@example.com\nother@example.com\nDUP@EXAMPLE.COM`;
    const result = parseRecipientsFromCsv(csvContent, "email");

    expect(result.valid).toEqual(["dup@example.com", "other@example.com"]);
    expect(result.duplicates).toBe(1);
  });

  it("supports alternative column headers like 'Email Address' or 'recipient'", () => {
    const csvContent = `Email Address,Score\nalex@reachinbox.ai,95`;
    const result = parseRecipientsFromCsv(csvContent, "Email Address");

    expect(result.valid).toEqual(["alex@reachinbox.ai"]);
  });
});
