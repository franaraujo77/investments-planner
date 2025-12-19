/**
 * EmptyAssets Component
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.2: Empty Assets State Shows "Add Your First Asset" CTA
 *
 * Displayed when a portfolio has no assets.
 * Uses base EmptyState component with asset-specific content.
 */

import { PlusCircle } from "lucide-react";
import { EmptyState } from "./empty-state";

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyAssetsProps {
  /** Callback when "Add Asset" CTA is clicked */
  onAddAsset: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmptyAssets Component
 *
 * Empty state for when a portfolio has no assets.
 *
 * AC-9.6.2 Requirements:
 * - Title: "Your portfolio is empty"
 * - Message: "Add assets to get personalized investment recommendations."
 * - Primary CTA: "Add Asset"
 * - CTA opens add asset modal/dialog
 *
 * @example
 * ```tsx
 * <EmptyAssets onAddAsset={() => setAddAssetModalOpen(true)} />
 * ```
 */
export function EmptyAssets({ onAddAsset, className }: EmptyAssetsProps) {
  return (
    <EmptyState
      icon={PlusCircle}
      title="Your portfolio is empty"
      message="Add assets to get personalized investment recommendations."
      primaryCta={{
        label: "Add Asset",
        onClick: onAddAsset,
      }}
      testId="empty-assets"
      {...(className && { className })}
    />
  );
}
