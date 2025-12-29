/**
 * User Profile API Routes
 *
 * Story 2.6: Profile Settings & Base Currency
 * Story 1.5: Regional Preferences and i18n Infrastructure
 *
 * GET /api/user/profile - Get current user profile
 * PATCH /api/user/profile - Update user profile (name, baseCurrency, locale)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";
import { handleDbError, databaseError } from "@/lib/api/responses";
import { getSafeUserById } from "@/lib/auth/service";
import { updateUserProfile } from "@/lib/services/user-service";
import type { AuthError } from "@/lib/auth/types";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

/**
 * Supported currencies for base currency setting
 * AC-2.6.2: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF
 */
const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "JPY", "CHF"] as const;

/**
 * Locale values array for Zod validation
 * Derived from canonical SUPPORTED_LOCALES in @/lib/i18n (AC-1.5.5)
 */
const LOCALE_VALUES = SUPPORTED_LOCALES.map((l) => l.value) as [Locale, ...Locale[]];

/**
 * Zod schema for profile update validation
 * AC-2.6.5: Name max 100 characters
 * AC-2.6.2: Base currency from allowed list
 * AC-1.5.1: Locale from allowed list
 */
const updateProfileSchema = z.object({
  name: z.string().max(100, "Name must be 100 characters or less").optional(),
  baseCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  locale: z.enum(LOCALE_VALUES).optional(),
});

/**
 * Profile response type
 */
interface ProfileResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    baseCurrency: string;
    locale: string;
    emailVerified: boolean;
    createdAt: Date;
  };
}

/**
 * GET /api/user/profile
 *
 * Returns the current user's profile data.
 * Requires authentication.
 *
 * Response:
 * - 200: { user: { id, email, name, baseCurrency, locale, emailVerified, createdAt } }
 * - 401: Not authenticated
 */
export const GET = withAuth<ProfileResponse>(async (_request, session) => {
  try {
    const user = await getSafeUserById(session.userId);

    if (!user) {
      return NextResponse.json<AuthError>(
        {
          error: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    return NextResponse.json<ProfileResponse>(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          baseCurrency: user.baseCurrency,
          locale: user.locale,
          emailVerified: user.emailVerified ?? false,
          createdAt: user.createdAt ?? new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const dbError = handleDbError(error, "fetch user profile", { userId: session.userId });
    return databaseError(dbError, "user profile");
  }
});

/**
 * PATCH /api/user/profile
 *
 * Updates the current user's profile.
 * Requires authentication.
 *
 * Request body:
 * - name?: string (max 100 chars)
 * - baseCurrency?: "USD" | "EUR" | "GBP" | "BRL" | "CAD" | "AUD" | "JPY" | "CHF"
 * - locale?: "en-US" | "pt-BR" | "de-DE" | "fr-FR" | "es-ES"
 *
 * Response:
 * - 200: { user } with updated data
 * - 400: Validation error
 * - 401: Not authenticated
 *
 * AC-2.6.3: Invalidates recommendation cache when currency changes
 * AC-2.6.4: Supports partial updates for auto-save
 */
export const PATCH = withAuth<ProfileResponse>(async (request, session) => {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = updateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json<AuthError>(
        {
          error: firstIssue?.message || "Invalid request data",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { name, baseCurrency, locale } = parseResult.data;

    // Check if there's anything to update
    if (name === undefined && baseCurrency === undefined && locale === undefined) {
      return NextResponse.json<AuthError>(
        {
          error: "No fields to update",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Build update data with only defined fields
    const updateData: { name?: string; baseCurrency?: string; locale?: string } = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (baseCurrency !== undefined) {
      updateData.baseCurrency = baseCurrency;
    }
    if (locale !== undefined) {
      updateData.locale = locale;
    }

    // Update user profile (handles cache invalidation internally)
    const updatedUser = await updateUserProfile(session.userId, updateData);

    return NextResponse.json<ProfileResponse>(
      {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          baseCurrency: updatedUser.baseCurrency,
          locale: updatedUser.locale,
          emailVerified: updatedUser.emailVerified ?? false,
          createdAt: updatedUser.createdAt ?? new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const dbError = handleDbError(error, "update user profile", { userId: session.userId });
    return databaseError(dbError, "user profile");
  }
});
