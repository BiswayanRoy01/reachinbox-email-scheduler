import { describe, it, expect } from "vitest";
import { safeJsonParse } from "../src/utils/json-parser.js";

describe("Resilient JSON Parser", () => {
  it("should parse standard valid JSON", () => {
    const json = '{"subject": "Hello", "body": "<p>Standard</p>"}';
    const parsed = safeJsonParse(json);
    expect(parsed.subject).toBe("Hello");
    expect(parsed.body).toBe("<p>Standard</p>");
  });

  it("should parse JSON containing raw unescaped newlines inside strings", () => {
    const rawWithNewlines = `{\n  "subject": "Follow-up",\n  "body": "<p>Line 1\nLine 2\nLine 3</p>"\n}`;
    expect(() => JSON.parse(rawWithNewlines)).toThrow(); // Native JSON.parse fails

    const parsed = safeJsonParse(rawWithNewlines);
    expect(parsed.subject).toBe("Follow-up");
    expect(parsed.body).toContain("Line 1");
    expect(parsed.body).toContain("Line 2");
  });

  it("should preserve already escaped characters", () => {
    const jsonWithEscaped = '{"body": "Hello \\"World\\""}';
    const parsed = safeJsonParse(jsonWithEscaped);
    expect(parsed.body).toBe('Hello "World"');
  });
});
