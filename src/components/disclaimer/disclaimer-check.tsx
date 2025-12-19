/**
 * Disclaimer Check Wrapper Component
 *
 * Story 9.4: Financial Disclaimers
 * AC-9.4.1: Modal shown on first dashboard visit, blocks access
 * AC-9.4.3: User must acknowledge before accessing dashboard
 *
 * Wraps dashboard content and shows disclaimer modal if user hasn't acknowledged.
 * Uses UserContext which is populated by VerificationGate.
 *
 * Key design decisions:
 * - Uses UserContext for disclaimer status (no extra API call needed)
 * - Shows modal overlay on dashboard content if not acknowledged
 * - Updates context when user acknowledges
 */

"use client";

import { useCallback } from "react";
import { useUser } from "@/contexts/user-context";
import { DisclaimerModal } from "./disclaimer-modal";

interface DisclaimerCheckProps {
  children: React.ReactNode;
}

/**
 * Disclaimer Check Component
 *
 * Wraps dashboard content and shows disclaimer modal if user
 * hasn't acknowledged the financial disclaimer.
 *
 * AC-9.4.1: Shows modal on first dashboard visit
 * AC-9.4.3: Blocks dashboard access until acknowledged
 *
 * Uses UserContext populated by VerificationGate.
 */
export function DisclaimerCheck({ children }: DisclaimerCheckProps) {
  const { user, setDisclaimerAcknowledged } = useUser();

  // Check if user has acknowledged disclaimer
  const hasAcknowledged = user?.disclaimerAcknowledgedAt !== null;

  // Handle successful acknowledgment from modal
  const handleAcknowledge = useCallback(() => {
    // Update context with current timestamp
    setDisclaimerAcknowledged(new Date().toISOString());
  }, [setDisclaimerAcknowledged]);

  // Always render children (dashboard content)
  // The modal overlays on top if not acknowledged
  return (
    <>
      {children}
      <DisclaimerModal open={!hasAcknowledged} onAcknowledge={handleAcknowledge} />
    </>
  );
}
