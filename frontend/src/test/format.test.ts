import { describe, it, expect } from "vitest";
import { formatDateTime, formatScheduledBadge, formatFileSize, truncateText } from "../utils/format";

describe("Formatting Utilities", () => {
  it("formats file sizes cleanly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });

  it("truncates long strings accurately", () => {
    expect(truncateText("Short", 10)).toBe("Short");
    expect(truncateText("This is a very long text snippet", 10)).toBe("This is a ...");
  });

  it("formats scheduled badges gracefully", () => {
    expect(formatScheduledBadge(null)).toBe("Scheduled");
    expect(formatScheduledBadge(undefined)).toBe("Scheduled");
  });
});
