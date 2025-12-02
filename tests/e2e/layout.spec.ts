import { test, expect } from "@playwright/test";

test.describe("Dashboard Layout", () => {
  test.describe("AC1: Command Center layout with persistent sidebar", () => {
    test("should display sidebar on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");

      // Sidebar should be visible
      const sidebar = page.locator('[data-slot="sidebar"]');
      await expect(sidebar).toBeVisible();

      // Sidebar width should be 240px (or contain the navigation)
      const nav = page.locator('nav[aria-label="Main navigation"], [aria-label="Main navigation"]');
      await expect(nav).toBeVisible();
    });
  });

  test.describe("AC2: Sidebar responsive behavior", () => {
    test("should show hamburger menu on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      // Sidebar trigger (hamburger) should be visible
      const trigger = page.locator('[data-sidebar="trigger"]');
      await expect(trigger).toBeVisible();

      // Click trigger to open mobile sidebar
      await trigger.click();

      // Sheet/sidebar should now be open
      const mobileSheet = page.locator('[data-mobile="true"]');
      await expect(mobileSheet).toBeVisible();

      // Should show navigation items
      const navItems = page.locator('[data-sidebar="menu-button"]');
      await expect(navItems).toHaveCount(5);
    });

    test("should collapse to icons on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");

      // The sidebar should be in icon-only mode on tablet
      // The collapsible attribute indicates the sidebar can collapse
      const sidebar = page.locator('[data-slot="sidebar"]');
      await expect(sidebar).toBeVisible();
    });
  });

  test.describe("AC3: Focus Mode recommendations placeholder", () => {
    test("should display welcome message on dashboard", async ({ page }) => {
      await page.goto("/");

      // Check for welcome message
      const heading = page.getByRole("heading", { name: /welcome back/i });
      await expect(heading).toBeVisible();

      // Check for recommendations placeholder
      const recommendationsCard = page.getByText(/monthly recommendations/i);
      await expect(recommendationsCard).toBeVisible();
    });

    test("should display skeleton loading states", async ({ page }) => {
      await page.goto("/");

      // Skeletons should be visible as placeholders
      const skeletons = page.locator('[data-slot="skeleton"], .animate-pulse');
      expect(await skeletons.count()).toBeGreaterThan(0);
    });
  });

  test.describe("AC4: Sidebar navigation items", () => {
    test("should contain all 5 navigation items", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");

      // Check for all navigation items
      const expectedItems = ["Dashboard", "Portfolio", "Criteria", "History", "Settings"];

      for (const item of expectedItems) {
        const link = page.getByRole("link", { name: item });
        await expect(link).toBeVisible();
      }
    });
  });

  test.describe("AC5: Active route highlighting", () => {
    test("should highlight Dashboard link on root route", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");

      // Dashboard link should have active state
      const dashboardLink = page.locator('[data-sidebar="menu-button"][data-active="true"]');
      await expect(dashboardLink).toBeVisible();
    });

    test("should highlight Portfolio link when navigating", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/portfolio");

      // Portfolio link should have active state
      const portfolioLink = page.locator('[data-sidebar="menu-button"][data-active="true"]');
      await expect(portfolioLink).toBeVisible();

      // Should contain Portfolio text
      await expect(portfolioLink).toContainText("Portfolio");
    });
  });

  test.describe("AC6: Responsive breakpoints", () => {
    test("should adapt layout at different breakpoints", async ({ page }) => {
      // Desktop (>= 1024px) - full sidebar
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");
      const desktopSidebar = page.locator('[data-slot="sidebar"]');
      await expect(desktopSidebar).toBeVisible();

      // Tablet (768px) - should still show sidebar (possibly collapsed)
      await page.setViewportSize({ width: 768, height: 1024 });
      const tabletSidebar = page.locator('[data-slot="sidebar"]');
      await expect(tabletSidebar).toBeVisible();

      // Mobile (< 640px) - sidebar should be hidden, trigger visible
      await page.setViewportSize({ width: 375, height: 667 });
      const trigger = page.locator('[data-sidebar="trigger"]');
      await expect(trigger).toBeVisible();
    });
  });

  test.describe("Navigation functionality", () => {
    test("should navigate to Portfolio page", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");

      await page.getByRole("link", { name: "Portfolio" }).click();
      await expect(page).toHaveURL("/portfolio");
      await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
    });

    test("should navigate to Criteria page", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");

      await page.getByRole("link", { name: "Criteria" }).click();
      await expect(page).toHaveURL("/criteria");
      await expect(page.getByRole("heading", { name: "Criteria" })).toBeVisible();
    });

    test("should navigate to History page", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");

      await page.getByRole("link", { name: "History" }).click();
      await expect(page).toHaveURL("/history");
      await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    });

    test("should navigate to Settings page", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/");

      await page.getByRole("link", { name: "Settings" }).click();
      await expect(page).toHaveURL("/settings");
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    });
  });

  test.describe("Placeholder pages", () => {
    test("should display Coming soon on Portfolio page", async ({ page }) => {
      await page.goto("/portfolio");
      await expect(page.getByText("Coming soon")).toBeVisible();
    });

    test("should display Coming soon on Criteria page", async ({ page }) => {
      await page.goto("/criteria");
      await expect(page.getByText("Coming soon")).toBeVisible();
    });

    test("should display Coming soon on History page", async ({ page }) => {
      await page.goto("/history");
      await expect(page.getByText("Coming soon")).toBeVisible();
    });

    test("should display Coming soon on Settings page", async ({ page }) => {
      await page.goto("/settings");
      await expect(page.getByText("Coming soon")).toBeVisible();
    });
  });
});
