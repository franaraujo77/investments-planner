/**
 * Auth Validation Schemas
 *
 * Zod schemas for authentication operations.
 * Story 2.1: User Registration Flow
 *
 * AC1: Valid email (RFC 5322 format)
 * AC2: Password complexity requirements
 * AC7: Disclaimer acknowledgment required
 */

import { z } from "zod";
import { AUTH_MESSAGES, PASSWORD_RULES } from "./constants";

/**
 * Email validation schema with RFC 5322 format
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email(AUTH_MESSAGES.INVALID_EMAIL)
  .max(255, "Email must be at most 255 characters")
  .transform((email) => email.toLowerCase().trim());

/**
 * Password validation schema with complexity requirements
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.MIN_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_SHORT)
  .max(PASSWORD_RULES.MAX_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_LONG)
  .refine((password) => /[a-z]/.test(password), {
    message: AUTH_MESSAGES.PASSWORD_MISSING_LOWERCASE,
  })
  .refine((password) => /[A-Z]/.test(password), {
    message: AUTH_MESSAGES.PASSWORD_MISSING_UPPERCASE,
  })
  .refine((password) => /\d/.test(password), {
    message: AUTH_MESSAGES.PASSWORD_MISSING_NUMBER,
  })
  .refine((password) => /[@$!%*?&]/.test(password), {
    message: AUTH_MESSAGES.PASSWORD_MISSING_SPECIAL,
  });

/**
 * Simple password schema (length only, for login)
 */
export const simplePasswordSchema = z
  .string()
  .min(PASSWORD_RULES.MIN_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_SHORT)
  .max(PASSWORD_RULES.MAX_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_LONG);

/**
 * Registration schema
 * Used for POST /api/auth/register
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().max(100, "Name must be at most 100 characters").optional(),
  disclaimerAcknowledged: z.literal(true, { message: AUTH_MESSAGES.DISCLAIMER_REQUIRED }),
});

/**
 * Login schema
 * Used for POST /api/auth/login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema,
  remember: z.boolean().optional().default(false),
});

/**
 * Type exports inferred from schemas
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Client-side registration form schema (slightly different for form state)
 * disclaimerAcknowledged is a boolean here for checkbox binding
 */
export const registerFormSchema = z.object({
  email: z.string().min(1, "Email is required").email(AUTH_MESSAGES.INVALID_EMAIL),
  password: z
    .string()
    .min(PASSWORD_RULES.MIN_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_SHORT)
    .max(PASSWORD_RULES.MAX_LENGTH, AUTH_MESSAGES.PASSWORD_TOO_LONG)
    .refine((password) => /[a-z]/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_LOWERCASE,
    })
    .refine((password) => /[A-Z]/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_UPPERCASE,
    })
    .refine((password) => /\d/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_NUMBER,
    })
    .refine((password) => /[@$!%*?&]/.test(password), {
      message: AUTH_MESSAGES.PASSWORD_MISSING_SPECIAL,
    }),
  name: z.string().max(100, "Name must be at most 100 characters").optional(),
  disclaimerAcknowledged: z.boolean().refine((val) => val === true, {
    message: AUTH_MESSAGES.DISCLAIMER_REQUIRED,
  }),
});

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

/**
 * Client-side login form schema
 * Story 2.3: User Login
 * Simpler validation - just presence check, server validates complexity
 */
export const loginFormSchema = z.object({
  email: z.string().min(1, "Email is required").email(AUTH_MESSAGES.INVALID_EMAIL),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;
