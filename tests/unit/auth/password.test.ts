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
  validatePasswordComplexity,
  calculatePasswordStrength,
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

// =============================================================================
// Story 2.1: Password Complexity Validation Tests (AC2)
// =============================================================================

describe("Password Complexity Validation (Story 2.1 AC2)", () => {
  describe("validatePasswordComplexity", () => {
    it("should reject password missing lowercase letter", () => {
      const result = validatePasswordComplexity("UPPERCASE123@");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject password missing uppercase letter", () => {
      const result = validatePasswordComplexity("lowercase123@");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject password missing number", () => {
      const result = validatePasswordComplexity("NoNumbers@!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should reject password missing special character", () => {
      const result = validatePasswordComplexity("NoSpecial123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character (@$!%*?&)"
      );
    });

    it("should reject password too short", () => {
      const result = validatePasswordComplexity("Sh0rt@");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters");
    });

    it("should reject password too long", () => {
      const longPassword = "ValidP@" + "a".repeat(66); // 73 chars
      const result = validatePasswordComplexity(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at most 72 characters");
    });

    it("should accept valid complex password", () => {
      const result = validatePasswordComplexity("ValidP@ss123");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return multiple errors for password with multiple issues", () => {
      const result = validatePasswordComplexity("short"); // missing everything
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it("should include strength in result", () => {
      const result = validatePasswordComplexity("ValidP@ss123");
      expect(result.strength).toBeDefined();
      expect(["weak", "medium", "strong"]).toContain(result.strength);
    });
  });
});

// =============================================================================
// Story 2.1: Password Strength Calculation Tests (AC3)
// =============================================================================

describe("Password Strength Calculation (Story 2.1 AC3)", () => {
  describe("calculatePasswordStrength", () => {
    it("should return weak for empty password", () => {
      expect(calculatePasswordStrength("")).toBe("weak");
    });

    it("should return weak for very short password", () => {
      expect(calculatePasswordStrength("abc")).toBe("weak");
    });

    it("should return weak for short password with only lowercase", () => {
      expect(calculatePasswordStrength("short")).toBe("weak");
    });

    it("should return medium for 8+ char password with multiple character types", () => {
      expect(calculatePasswordStrength("Medium@12")).toBe("medium");
    });

    it("should return strong for 16+ char password with all character types", () => {
      expect(calculatePasswordStrength("VeryStr0ngP@ssword!")).toBe("strong");
    });

    it("should penalize common weak passwords", () => {
      // Passwords containing common patterns should score lower
      const withPassword = calculatePasswordStrength("Password123!");
      const withoutPassword = calculatePasswordStrength("Secure1234!");
      const strengthOrder = { weak: 0, medium: 1, strong: 2 };
      expect(strengthOrder[withPassword]).toBeLessThanOrEqual(strengthOrder[withoutPassword]);
    });

    it("should detect 'qwerty' as weak", () => {
      expect(calculatePasswordStrength("Qwerty123@")).toBe("weak");
    });

    it("should return consistent results for same input", () => {
      const password = "TestPassword123!";
      const result1 = calculatePasswordStrength(password);
      const result2 = calculatePasswordStrength(password);
      expect(result1).toBe(result2);
    });

    it("should increase strength with length", () => {
      const short = calculatePasswordStrength("Ab1@cdef"); // 8 chars
      const long = calculatePasswordStrength("Ab1@cdefghijklmno"); // 18 chars
      // Long should be >= short
      const strengthOrder = { weak: 0, medium: 1, strong: 2 };
      expect(strengthOrder[long]).toBeGreaterThanOrEqual(strengthOrder[short]);
    });
  });
});
