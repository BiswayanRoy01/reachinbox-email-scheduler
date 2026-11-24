import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { config } from "../src/config/index.js";
import { authService } from "../src/services/auth.service.js";

describe("Authentication & JWT Security", () => {
  it("should sign and verify valid JWT token", () => {
    const userPayload = {
      id: "user-test-uuid",
      email: "test.engineer@reachinbox.ai"
    };

    const token = authService.generateToken(userPayload);
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    expect(decoded.id).toBe(userPayload.id);
    expect(decoded.email).toBe(userPayload.email);
  });

  it("should fail verification with invalid secret or tampered token", () => {
    const userPayload = { id: "user-1", email: "user@test.com" };
    const token = authService.generateToken(userPayload);
    const tampered = token.slice(0, -5) + "abcde";

    expect(() => jwt.verify(tampered, config.jwt.secret)).toThrow();
  });
});
