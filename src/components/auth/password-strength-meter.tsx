"use client";

/**
 * Password Strength Meter Component
 *
 * Story 2.1: User Registration Flow (AC3)
 * Displays real-time password strength feedback.
 *
 * Strength calculation based on:
 * - Length (8-11 chars = weak, 12-15 = medium, 16+ = strong base)
 * - Character variety (lowercase, uppercase, numbers, special)
 * - Common patterns check
 */

import { Progress } from "@/components/ui/progress";
import { calculatePasswordStrength, type PasswordStrength } from "@/lib/auth/password-strength";

interface PasswordStrengthMeterProps {
  password: string;
}

const strengthConfig: Record<
  PasswordStrength,
  { label: string; color: string; bgColor: string; value: number }
> = {
  weak: {
    label: "Weak",
    color: "text-red-600 dark:text-red-400",
    bgColor: "[&>div]:bg-red-500",
    value: 25,
  },
  medium: {
    label: "Medium",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "[&>div]:bg-yellow-500",
    value: 60,
  },
  strong: {
    label: "Strong",
    color: "text-green-600 dark:text-green-400",
    bgColor: "[&>div]:bg-green-500",
    value: 100,
  },
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password);
  const config = strengthConfig[strength];

  return (
    <div className="mt-2 space-y-1">
      <Progress
        value={config.value}
        className={`h-1.5 ${config.bgColor}`}
        aria-label={`Password strength: ${config.label}`}
      />
      <p className={`text-xs ${config.color}`}>{config.label}</p>
    </div>
  );
}
