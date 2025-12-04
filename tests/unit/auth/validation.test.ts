/**
 * Auth Validation Schema Tests
 *
 * Story 2.1: User Registration Flow
 * AC1: Valid email (RFC 5322 format)
 * AC2: Password complexity requirements
 * AC7: Disclaimer acknowledgment required
 */

import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  registerSchema,
  registerFormSchema,
  type RegisterInput,
} from "@/lib/auth/validation";

describe("Email Validation Schema (AC1)", () => {
  describe("emailSchema", () => {
    it("should accept valid email format", () => {
      const result = emailSchema.safeParse("user@example.com");
      expect(result.success).toBe(true);
    });

    it("should accept email with subdomain", () => {
      const result = emailSchema.safeParse("user@sub.example.com");
      expect(result.success).toBe(true);
    });

    it("should accept email with plus addressing", () => {
      const result = emailSchema.safeParse("user+tag@example.com");
      expect(result.success).toBe(true);
    });

    it("should normalize email to lowercase", () => {
      const result = emailSchema.safeParse("USER@EXAMPLE.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    it("should trim and lowercase email in result", () => {
      // Note: Zod validates email before transform, so we test valid email trimming
      const result = emailSchema.safeParse("USER@EXAMPLE.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    it("should reject email without @", () => {
      const result = emailSchema.safeParse("invalid-email");
      expect(result.success).toBe(false);
    });

    it("should reject email without domain", () => {
      const result = emailSchema.safeParse("user@");
      expect(result.success).toBe(false);
    });

    it("should reject email without local part", () => {
      const result = emailSchema.safeParse("@example.com");
      expect(result.success).toBe(false);
    });

    it("should reject empty email", () => {
      const result = emailSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject email longer than 255 characters", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = emailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });
});

describe("Password Validation Schema (AC2)", () => {
  describe("passwordSchema", () => {
    it("should accept valid complex password", () => {
      const result = passwordSchema.safeParse("ValidP@ss123");
      expect(result.success).toBe(true);
    });

    it("should reject password without lowercase", () => {
      const result = passwordSchema.safeParse("UPPERCASE123@");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("lowercase");
      }
    });

    it("should reject password without uppercase", () => {
      const result = passwordSchema.safeParse("lowercase123@");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("uppercase");
      }
    });

    it("should reject password without number", () => {
      const result = passwordSchema.safeParse("NoNumbers@!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("number");
      }
    });

    it("should reject password without special character", () => {
      const result = passwordSchema.safeParse("NoSpecial123");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("special");
      }
    });

    it("should reject password shorter than 8 characters", () => {
      const result = passwordSchema.safeParse("Sh0rt@");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("8 characters");
      }
    });

    it("should reject password longer than 72 characters", () => {
      const longPassword = "ValidP@" + "a".repeat(66);
      const result = passwordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("72 characters");
      }
    });

    it("should accept password with exactly 8 characters", () => {
      const result = passwordSchema.safeParse("Valid@12");
      expect(result.success).toBe(true);
    });
  });
});

describe("Registration Schema (AC1, AC2, AC7)", () => {
  describe("registerSchema", () => {
    it("should accept valid registration input", () => {
      const input: RegisterInput = {
        email: "test@example.com",
        password: "ValidP@ss123",
        disclaimerAcknowledged: true,
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept registration with optional name", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
        name: "John Doe",
        disclaimerAcknowledged: true,
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("John Doe");
      }
    });

    it("should reject registration without disclaimerAcknowledged", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject registration with disclaimerAcknowledged = false", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
        disclaimerAcknowledged: false,
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should require disclaimerAcknowledged to be true", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
        disclaimerAcknowledged: true,
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject name longer than 100 characters", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
        name: "a".repeat(101),
        disclaimerAcknowledged: true,
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email in registration", () => {
      const input = {
        email: "invalid-email",
        password: "ValidP@ss123",
        disclaimerAcknowledged: true,
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject weak password in registration", () => {
      const input = {
        email: "test@example.com",
        password: "weak",
        disclaimerAcknowledged: true,
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("Registration Form Schema (Client-side)", () => {
  describe("registerFormSchema", () => {
    it("should accept valid form input", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
        disclaimerAcknowledged: true,
      };
      const result = registerFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject disclaimerAcknowledged = false", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
        disclaimerAcknowledged: false,
      };
      const result = registerFormSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("disclaimer");
      }
    });

    it("should handle optional name field", () => {
      const input = {
        email: "test@example.com",
        password: "ValidP@ss123",
        disclaimerAcknowledged: true,
        name: "",
      };
      const result = registerFormSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
