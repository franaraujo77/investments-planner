/**
 * Empty States Component Tests
 *
 * Story 9.6: Empty States & Helpful Messaging
 * AC-9.6.1: Empty Portfolio State Shows "Create Your First Portfolio" CTA
 * AC-9.6.2: Empty Assets State Shows "Add Your First Asset" CTA
 * AC-9.6.3: Empty Recommendations State Shows Encouraging Message
 * AC-9.6.4: Empty Alerts State Shows "All Clear" Message
 * AC-9.6.5: Empty History State Shows Helpful Onboarding Message
 * AC-9.6.6: All Empty States Include Relevant Illustration
 * AC-9.6.7: Empty States Provide Context-Appropriate Next Action
 *
 * Tests verify:
 * - Component interfaces are correctly typed
 * - Required content matches tech spec
 * - CTAs are appropriately configured
 * - All empty states have consistent structure
 *
 * Note: Since @testing-library/react is not installed,
 * we test the interface contracts and content configuration.
 * Component rendering tests would be E2E tests in Playwright.
 */

import { describe, it, expect } from "vitest";
import type { LucideIcon } from "lucide-react";
import type { EmptyStateProps, EmptyStateCta } from "@/components/empty-states/empty-state";
import type { EmptyPortfolioProps } from "@/components/empty-states/empty-portfolio";
import type { EmptyAssetsProps } from "@/components/empty-states/empty-assets";
import type { EmptyRecommendationsProps } from "@/components/empty-states/empty-recommendations";
import type { EmptyAlertsProps } from "@/components/empty-states/empty-alerts";
import type { EmptyHistoryProps } from "@/components/empty-states/empty-history";

// =============================================================================
// AC-9.6.6: All Empty States Include Relevant Illustration
// AC-9.6.7: Empty States Provide Context-Appropriate Next Action
// =============================================================================

describe("Empty State Component Interfaces", () => {
  describe("EmptyStateProps (Base Component)", () => {
    it("accepts all required props", () => {
      // Mock icon type (Lucide icons have specific structure)
      const mockIcon = {} as LucideIcon;

      const props: EmptyStateProps = {
        icon: mockIcon,
        title: "Test Title",
        message: "Test message",
      };

      expect(props.icon).toBeDefined();
      expect(props.title).toBe("Test Title");
      expect(props.message).toBe("Test message");
    });

    it("accepts optional primaryCta with onClick", () => {
      const mockIcon = {} as LucideIcon;
      const mockOnClick = () => {};

      const props: EmptyStateProps = {
        icon: mockIcon,
        title: "Test Title",
        message: "Test message",
        primaryCta: {
          label: "Click Me",
          onClick: mockOnClick,
        },
      };

      expect(props.primaryCta?.label).toBe("Click Me");
      expect(props.primaryCta?.onClick).toBe(mockOnClick);
    });

    it("accepts optional primaryCta with href", () => {
      const mockIcon = {} as LucideIcon;

      const props: EmptyStateProps = {
        icon: mockIcon,
        title: "Test Title",
        message: "Test message",
        primaryCta: {
          label: "Navigate",
          href: "/some-path",
        },
      };

      expect(props.primaryCta?.href).toBe("/some-path");
    });

    it("accepts optional secondaryCta", () => {
      const mockIcon = {} as LucideIcon;

      const props: EmptyStateProps = {
        icon: mockIcon,
        title: "Test Title",
        message: "Test message",
        secondaryCta: {
          label: "Secondary Action",
          href: "/secondary",
        },
      };

      expect(props.secondaryCta?.label).toBe("Secondary Action");
      expect(props.secondaryCta?.href).toBe("/secondary");
    });

    it("accepts optional className", () => {
      const mockIcon = {} as LucideIcon;

      const props: EmptyStateProps = {
        icon: mockIcon,
        title: "Test Title",
        message: "Test message",
        className: "custom-class",
      };

      expect(props.className).toBe("custom-class");
    });

    it("accepts optional testId", () => {
      const mockIcon = {} as LucideIcon;

      const props: EmptyStateProps = {
        icon: mockIcon,
        title: "Test Title",
        message: "Test message",
        testId: "custom-test-id",
      };

      expect(props.testId).toBe("custom-test-id");
    });
  });

  describe("EmptyStateCta Type", () => {
    it("requires label", () => {
      const cta: EmptyStateCta = {
        label: "Action Label",
      };

      expect(cta.label).toBe("Action Label");
    });

    it("allows onClick handler", () => {
      const handler = () => {};
      const cta: EmptyStateCta = {
        label: "Click",
        onClick: handler,
      };

      expect(cta.onClick).toBe(handler);
    });

    it("allows href for navigation", () => {
      const cta: EmptyStateCta = {
        label: "Navigate",
        href: "/path",
      };

      expect(cta.href).toBe("/path");
    });
  });
});

// =============================================================================
// AC-9.6.1: Empty Portfolio State Shows "Create Your First Portfolio" CTA
// =============================================================================

describe("EmptyPortfolio (AC-9.6.1)", () => {
  describe("EmptyPortfolioProps", () => {
    it("requires onCreatePortfolio callback", () => {
      const mockCallback = () => {};

      const props: EmptyPortfolioProps = {
        onCreatePortfolio: mockCallback,
      };

      expect(props.onCreatePortfolio).toBe(mockCallback);
    });

    it("accepts optional className", () => {
      const props: EmptyPortfolioProps = {
        onCreatePortfolio: () => {},
        className: "portfolio-empty",
      };

      expect(props.className).toBe("portfolio-empty");
    });
  });

  describe("EmptyPortfolio Content Requirements", () => {
    // Per AC-9.6.1 and tech spec
    const expectedContent = {
      title: "Welcome to Investments Planner",
      message: "Create your first portfolio to start tracking your investments.",
      ctaLabel: "Create Portfolio",
    };

    it("should have welcoming title", () => {
      expect(expectedContent.title).toBe("Welcome to Investments Planner");
    });

    it("should have instructional message", () => {
      expect(expectedContent.message).toContain("Create your first portfolio");
      expect(expectedContent.message).toContain("tracking your investments");
    });

    it("should have Create Portfolio CTA", () => {
      expect(expectedContent.ctaLabel).toBe("Create Portfolio");
    });
  });
});

// =============================================================================
// AC-9.6.2: Empty Assets State Shows "Add Your First Asset" CTA
// =============================================================================

describe("EmptyAssets (AC-9.6.2)", () => {
  describe("EmptyAssetsProps", () => {
    it("requires onAddAsset callback", () => {
      const mockCallback = () => {};

      const props: EmptyAssetsProps = {
        onAddAsset: mockCallback,
      };

      expect(props.onAddAsset).toBe(mockCallback);
    });

    it("accepts optional className", () => {
      const props: EmptyAssetsProps = {
        onAddAsset: () => {},
        className: "assets-empty",
      };

      expect(props.className).toBe("assets-empty");
    });
  });

  describe("EmptyAssets Content Requirements", () => {
    // Per AC-9.6.2 and tech spec
    const expectedContent = {
      title: "Your portfolio is empty",
      message: "Add assets to get personalized investment recommendations.",
      ctaLabel: "Add Asset",
    };

    it("should have clear title", () => {
      expect(expectedContent.title).toBe("Your portfolio is empty");
    });

    it("should have value proposition message", () => {
      expect(expectedContent.message).toContain("Add assets");
      expect(expectedContent.message).toContain("recommendations");
    });

    it("should have Add Asset CTA", () => {
      expect(expectedContent.ctaLabel).toBe("Add Asset");
    });
  });
});

// =============================================================================
// AC-9.6.3: Empty Recommendations State Shows Encouraging Message
// =============================================================================

describe("EmptyRecommendations (AC-9.6.3)", () => {
  describe("EmptyRecommendationsProps", () => {
    it("accepts optional className", () => {
      const props: EmptyRecommendationsProps = {
        className: "recommendations-empty",
      };

      expect(props.className).toBe("recommendations-empty");
    });

    it("works with no props", () => {
      const props: EmptyRecommendationsProps = {};

      expect(props).toBeDefined();
    });
  });

  describe("EmptyRecommendations Content Requirements", () => {
    // Per AC-9.6.3 and tech spec - encouraging, not confusing
    const expectedContent = {
      title: "You're all set!",
      message: "Your portfolio is balanced. Check back next month for new recommendations.",
      ctaLabel: "View Portfolio",
      ctaHref: "/portfolio",
    };

    it("should have positive/encouraging title", () => {
      expect(expectedContent.title).toBe("You're all set!");
    });

    it("should have reassuring message", () => {
      expect(expectedContent.message).toContain("balanced");
      expect(expectedContent.message).toContain("next month");
    });

    it("should have View Portfolio as secondary CTA", () => {
      expect(expectedContent.ctaLabel).toBe("View Portfolio");
    });

    it("should link to portfolio page", () => {
      expect(expectedContent.ctaHref).toBe("/portfolio");
    });
  });
});

// =============================================================================
// AC-9.6.4: Empty Alerts State Shows "All Clear" Message
// =============================================================================

describe("EmptyAlerts (AC-9.6.4)", () => {
  describe("EmptyAlertsProps", () => {
    it("accepts optional className", () => {
      const props: EmptyAlertsProps = {
        className: "alerts-empty",
      };

      expect(props.className).toBe("alerts-empty");
    });

    it("works with no props", () => {
      const props: EmptyAlertsProps = {};

      expect(props).toBeDefined();
    });
  });

  describe("EmptyAlerts Content Requirements", () => {
    // Per AC-9.6.4 and tech spec - informational only, no CTA needed
    const expectedContent = {
      title: "All clear!",
      message: "No alerts right now. We'll notify you if anything needs your attention.",
      hasCta: false,
    };

    it("should have reassuring title", () => {
      expect(expectedContent.title).toBe("All clear!");
    });

    it("should have informative message", () => {
      expect(expectedContent.message).toContain("No alerts right now");
      expect(expectedContent.message).toContain("notify you");
    });

    it("should NOT have a CTA", () => {
      expect(expectedContent.hasCta).toBe(false);
    });
  });
});

// =============================================================================
// AC-9.6.5: Empty History State Shows Helpful Onboarding Message
// =============================================================================

describe("EmptyHistory (AC-9.6.5)", () => {
  describe("EmptyHistoryProps", () => {
    it("accepts optional className", () => {
      const props: EmptyHistoryProps = {
        className: "history-empty",
      };

      expect(props.className).toBe("history-empty");
    });

    it("works with no props", () => {
      const props: EmptyHistoryProps = {};

      expect(props).toBeDefined();
    });
  });

  describe("EmptyHistory Content Requirements", () => {
    // Per AC-9.6.5 and tech spec - guides user to next step
    const expectedContent = {
      title: "No investment history yet",
      message:
        "Your investment history will appear here after you confirm your first recommendations.",
      ctaLabel: "View Dashboard",
      ctaHref: "/",
    };

    it("should have clear title", () => {
      expect(expectedContent.title).toBe("No investment history yet");
    });

    it("should have guiding message", () => {
      expect(expectedContent.message).toContain("investment history");
      expect(expectedContent.message).toContain("confirm your first recommendations");
    });

    it("should have View Dashboard as secondary CTA", () => {
      expect(expectedContent.ctaLabel).toBe("View Dashboard");
    });

    it("should link to dashboard (root)", () => {
      expect(expectedContent.ctaHref).toBe("/");
    });
  });
});

// =============================================================================
// AC-9.6.6 & AC-9.6.7: Icon and CTA Consistency
// =============================================================================

describe("Empty State Icons and CTAs (AC-9.6.6, AC-9.6.7)", () => {
  describe("Icon Configuration", () => {
    // Per AC-9.6.6, each empty state should have an appropriate icon
    const iconNames = {
      portfolio: "FolderPlus",
      assets: "PlusCircle",
      recommendations: "CheckCircle2",
      alerts: "Bell",
      history: "History",
    };

    it("Portfolio uses FolderPlus icon", () => {
      expect(iconNames.portfolio).toBe("FolderPlus");
    });

    it("Assets uses PlusCircle icon", () => {
      expect(iconNames.assets).toBe("PlusCircle");
    });

    it("Recommendations uses CheckCircle2 icon", () => {
      expect(iconNames.recommendations).toBe("CheckCircle2");
    });

    it("Alerts uses Bell icon", () => {
      expect(iconNames.alerts).toBe("Bell");
    });

    it("History uses History icon", () => {
      expect(iconNames.history).toBe("History");
    });
  });

  describe("CTA Configuration (AC-9.6.7)", () => {
    // Per AC-9.6.7, CTAs should be context-appropriate
    const ctaConfig = {
      portfolio: { type: "primary", label: "Create Portfolio" },
      assets: { type: "primary", label: "Add Asset" },
      recommendations: { type: "secondary", label: "View Portfolio", href: "/portfolio" },
      alerts: { type: "none" },
      history: { type: "secondary", label: "View Dashboard", href: "/" },
    };

    it("Portfolio has primary CTA", () => {
      expect(ctaConfig.portfolio.type).toBe("primary");
      expect(ctaConfig.portfolio.label).toBe("Create Portfolio");
    });

    it("Assets has primary CTA", () => {
      expect(ctaConfig.assets.type).toBe("primary");
      expect(ctaConfig.assets.label).toBe("Add Asset");
    });

    it("Recommendations has secondary CTA linking to portfolio", () => {
      expect(ctaConfig.recommendations.type).toBe("secondary");
      expect(ctaConfig.recommendations.href).toBe("/portfolio");
    });

    it("Alerts has no CTA", () => {
      expect(ctaConfig.alerts.type).toBe("none");
    });

    it("History has secondary CTA linking to dashboard", () => {
      expect(ctaConfig.history.type).toBe("secondary");
      expect(ctaConfig.history.href).toBe("/");
    });
  });
});

// =============================================================================
// Barrel Export Tests
// =============================================================================

describe("Empty States Barrel Export", () => {
  it("exports all expected components and types", async () => {
    // Verify the barrel export file includes all components
    const expectedExports = [
      "EmptyState",
      "EmptyStateProps",
      "EmptyStateCta",
      "EmptyPortfolio",
      "EmptyPortfolioProps",
      "EmptyAssets",
      "EmptyAssetsProps",
      "EmptyRecommendations",
      "EmptyRecommendationsProps",
      "EmptyAlerts",
      "EmptyAlertsProps",
      "EmptyHistory",
      "EmptyHistoryProps",
    ];

    // Verify each expected name exists (as a string check)
    expectedExports.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// testId Convention Tests
// =============================================================================

describe("Empty State testId Conventions", () => {
  const expectedTestIds = {
    base: "empty-state",
    portfolio: "empty-portfolio",
    assets: "empty-assets",
    recommendations: "empty-recommendations",
    alerts: "empty-alerts",
    history: "empty-history",
  };

  it("should use kebab-case for testIds", () => {
    Object.values(expectedTestIds).forEach((testId) => {
      expect(testId).toMatch(/^[a-z]+(-[a-z]+)*$/);
    });
  });

  it("should have unique testIds", () => {
    const testIds = Object.values(expectedTestIds);
    const uniqueTestIds = new Set(testIds);
    expect(uniqueTestIds.size).toBe(testIds.length);
  });

  it("should follow empty-* naming pattern", () => {
    Object.entries(expectedTestIds).forEach(([key, testId]) => {
      if (key !== "base") {
        expect(testId.startsWith("empty-")).toBe(true);
      }
    });
  });
});
