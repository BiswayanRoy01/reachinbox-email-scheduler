import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../src/utils/crypto.js";

describe("Crypto Utility (AES-256-GCM)", () => {
  it("should encrypt and decrypt a plaintext string correctly", () => {
    const secret = "SuperSecretSmtpPassword123!@#";
    const encrypted = encrypt(secret);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(secret);
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:cipher

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(secret);
  });

  it("should produce different ciphertexts for the same plaintext due to random IV", () => {
    const plaintext = "slack-access-token-xoxb-123456";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);

    expect(enc1).not.toEqual(enc2);
    expect(decrypt(enc1)).toEqual(plaintext);
    expect(decrypt(enc2)).toEqual(plaintext);
  });

  it("should return empty string if input is empty", () => {
    expect(encrypt("")).toEqual("");
    expect(decrypt("")).toEqual("");
  });
});
