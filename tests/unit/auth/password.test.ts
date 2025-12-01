/**
 * Password Hashing Tests
 *
 * Tests for Story 1.3 AC3: Passwords are hashed with bcrypt (cost factor 12)
 *
 * NOTE: These tests require Vitest (Story 1.7) to be installed.
 * Run with: pnpm test
 */

import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
} from "@/lib/auth/password";

describe("Password Validation", () => {
  it("should reject passwords shorter than 8 characters", () => {
    const result = validatePassword("short");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("8 characters");
  });

  it("should reject passwords longer than 72 characters", () => {
    const longPassword = "a".repeat(73);
    const result = validatePassword(longPassword);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("72 characters");
  });

  it("should accept valid passwords", () => {
    const result = validatePassword("validPassword123");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("Password Hashing (AC: 3)", () => {
  it("should hash password and not return plaintext", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);

    // Hash should not be the same as plaintext
    expect(hash).not.toBe(password);

    // Hash should be a bcrypt hash (starts with $2b$)
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("should produce different hash each time (salt working)", async () => {
    const password = "mySecurePassword123";

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Hashes should be different due to different salts
    expect(hash1).not.toBe(hash2);
  });

  it("should use cost factor 12", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);

    // bcrypt hash format: $2b$12$... (12 is the cost factor)
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("should throw error for invalid password", async () => {
    await expect(hashPassword("short")).rejects.toThrow("8 characters");
  });
});

describe("Password Verification (AC: 3)", () => {
  it("should return true for correct password", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);

    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it("should return false for incorrect password", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);

    const result = await verifyPassword("wrongPassword", hash);
    expect(result).toBe(false);
  });

  it("should handle similar but different passwords", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);

    // Very similar but not exact
    const result = await verifyPassword("mySecurePassword124", hash);
    expect(result).toBe(false);
  });

  it("should be timing-safe (both correct and incorrect take similar time)", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);

    // Measure correct password time
    const correctStart = performance.now();
    await verifyPassword(password, hash);
    const correctTime = performance.now() - correctStart;

    // Measure incorrect password time
    const incorrectStart = performance.now();
    await verifyPassword("wrongPassword", hash);
    const incorrectTime = performance.now() - incorrectStart;

    // Times should be within reasonable range (bcrypt is timing-safe)
    // Allow for some variance due to system load
    const ratio = Math.max(correctTime, incorrectTime) / Math.min(correctTime, incorrectTime);
    expect(ratio).toBeLessThan(2); // Should be within 2x
  });
});
