"use client";

/**
 * Global Providers Component
 *
 * Story 1.5: Regional Preferences and i18n Infrastructure
 * AC-1.5.4: NumberFormatProvider Integration
 *
 * This client component wraps the application with necessary providers.
 * It uses DEFAULT_LOCALE initially; authenticated users get their
 * locale from LocaleProvider in the dashboard layout.
 */

import type { ReactNode } from "react";
import { NumberFormatProvider } from "@/lib/i18n";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <NumberFormatProvider>{children}</NumberFormatProvider>;
}
