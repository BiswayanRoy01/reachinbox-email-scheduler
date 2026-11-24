/**
 * Sanitizes raw unescaped control characters (newlines, carriage returns, tabs)
 * that occur inside JSON string literals.
 */
export function sanitizeJsonControlCharacters(rawJson: string): string {
  let inString = false;
  let isEscaped = false;
  let result = "";

  for (let i = 0; i < rawJson.length; i++) {
    const char = rawJson[i];

    if (inString) {
      if (char === "\\" && !isEscaped) {
        isEscaped = true;
        result += char;
        continue;
      }

      if (char === '"' && !isEscaped) {
        inString = false;
        result += char;
        continue;
      }

      if (isEscaped) {
        isEscaped = false;
        result += char;
        continue;
      }

      // Inside string literal and not escaped:
      // Replace raw control characters
      if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else if (char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  return result;
}

/**
 * Resilient JSON parser that handles both standard JSON and JSON with raw multiline control characters.
 */
export function safeJsonParse(rawString: string): any {
  try {
    return JSON.parse(rawString);
  } catch (initialError: any) {
    if (
      initialError.message?.includes("control character") ||
      initialError.message?.includes("Unexpected token")
    ) {
      const sanitized = sanitizeJsonControlCharacters(rawString);
      return JSON.parse(sanitized);
    }
    throw initialError;
  }
}
