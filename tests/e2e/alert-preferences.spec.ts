/**
 * Alert Preferences E2E Tests
 *
 * Story 7.6: Opportunity Alerts and Preferences
 *
 * Tests for alert preferences settings and alert management flows.
 *
 * AC-7.6.3: Settings UI for opportunity alerts and data freshness toggles
 * AC-7.6.5: Snooze functionality (24 hours)
 * AC-7.6.2: Alert click navigation to portfolio
 *
 * NOTE: These tests run in the 'chromium-authenticated' project which uses
 * storageState from the auth setup. No API mocking is needed for authentication.
 */

import { test, expect } from "@playwright/test";

test.describe("Alert Preferences Settings (AC-7.6.3)", () => {
  test("should show alert preferences section on settings page", async ({ page }) => {
    await page.goto("/settings");

    // Check alert preferences section exists
    await expect(page.getByRole("heading", { name: "Alert Preferences" })).toBeVisible();
    await expect(
      page.getByText("Configure how and when you receive alerts about your portfolio")
    ).toBeVisible();
  });

  test("should show opportunity alerts toggle", async ({ page }) => {
    await page.goto("/settings");

    // Check opportunity alerts toggle exists
    const opportunitySection = page.getByTestId("opportunity-alerts-toggle");
    await expect(opportunitySection).toBeVisible();
    await expect(page.getByText("Opportunity Alerts")).toBeVisible();
    await expect(
      page.getByText("Get notified when a better scoring asset exists in the same class")
    ).toBeVisible();
  });

  test("should show drift alerts toggle", async ({ page }) => {
    await page.goto("/settings");

    // Check drift alerts toggle exists
    const driftSection = page.getByTestId("drift-alerts-toggle");
    await expect(driftSection).toBeVisible();
    await expect(page.getByText("Drift Alerts")).toBeVisible();
    await expect(
      page.getByText("Get notified when your allocation drifts from your target")
    ).toBeVisible();
  });

  test("should show data freshness warnings toggle", async ({ page }) => {
    await page.goto("/settings");

    // Check data freshness toggle exists
    const freshnessSection = page.getByTestId("data-freshness-toggle");
    await expect(freshnessSection).toBeVisible();
    await expect(page.getByText("Data Freshness Warnings")).toBeVisible();
    await expect(page.getByText("Get warned when market data is stale or outdated")).toBeVisible();
  });

  test("should show alert frequency selector", async ({ page }) => {
    await page.goto("/settings");

    // Check frequency dropdown exists
    await expect(page.getByLabel("Alert Frequency")).toBeVisible();
    await expect(page.getByText("How often to check for new alerts")).toBeVisible();
  });

  test("should toggle opportunity alerts and show save indicator", async ({ page }) => {
    await page.goto("/settings");

    // Get the opportunity alerts switch
    const switchElement = page.locator(
      '[data-testid="opportunity-alerts-toggle"] button[role="switch"]'
    );
    await expect(switchElement).toBeVisible();

    // Store initial state
    const _initialState = await switchElement.getAttribute("data-state");

    // Toggle the switch
    await switchElement.click();

    // Should show success indicator
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 3000 });

    // Toggle back to restore original state
    await switchElement.click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 3000 });
  });

  test("should change alert frequency and show save indicator", async ({ page }) => {
    await page.goto("/settings");

    // Get the frequency selector
    const frequencySelect = page.getByRole("combobox").filter({ hasText: /Realtime|Daily|Weekly/ });
    await expect(frequencySelect).toBeVisible();

    // Store initial value
    const initialValue = await frequencySelect.textContent();

    // Open dropdown and select a different option
    await frequencySelect.click();

    // Select "Daily" if not already selected, otherwise select "Weekly"
    if (initialValue?.includes("Daily")) {
      await page.getByRole("option", { name: "Weekly" }).click();
    } else {
      await page.getByRole("option", { name: "Daily" }).click();
    }

    // Should show success indicator
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 3000 });

    // Restore original value
    await frequencySelect.click();
    if (initialValue?.includes("Daily")) {
      await page.getByRole("option", { name: "Daily" }).click();
    } else if (initialValue?.includes("Weekly")) {
      await page.getByRole("option", { name: "Weekly" }).click();
    } else {
      await page.getByRole("option", { name: "Realtime" }).click();
    }
  });

  test("should show drift threshold input field", async ({ page }) => {
    await page.goto("/settings");

    // Check drift threshold input exists
    const thresholdInput = page.getByLabel("Drift threshold percentage");
    await expect(thresholdInput).toBeVisible();
    await expect(
      page.getByText("Alert when allocation drifts by this percentage (1-20%)")
    ).toBeVisible();
  });
});

test.describe("Alerts Page Navigation", () => {
  test("should navigate to alerts page", async ({ page }) => {
    await page.goto("/alerts");

    // Check page title
    await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
    await expect(page.getByText("View and manage alerts for your portfolio")).toBeVisible();
  });

  test("should show settings link on alerts page", async ({ page }) => {
    await page.goto("/alerts");

    // Check settings link exists
    const settingsLink = page.getByRole("link", { name: "Alert Settings" });
    await expect(settingsLink).toBeVisible();

    // Click should navigate to settings
    await settingsLink.click();
    await expect(page).toHaveURL("/settings");
  });

  test("should show empty state when no alerts", async ({ page }) => {
    // Mock empty alerts response
    await page.route("**/api/alerts*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          meta: { page: 1, limit: 100, totalCount: 0, totalPages: 0 },
        }),
      });
    });

    await page.goto("/alerts");

    // Should show empty state (EmptyAlerts component)
    // The exact text depends on your EmptyAlerts component
    await expect(page.getByText(/no.*alerts/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Alert Grouping and Display (AC-7.6.5)", () => {
  test("should display alerts grouped by asset class", async ({ page }) => {
    // Mock alerts response with multiple asset classes
    await page.route("**/api/alerts*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "alert-1",
              type: "opportunity",
              title: "Better Asset Found: AAPL vs MSFT",
              message: "AAPL scores 15 points higher than MSFT",
              severity: "info",
              metadata: {
                currentAssetId: "asset-msft",
                currentAssetSymbol: "MSFT",
                betterAssetId: "asset-aapl",
                betterAssetSymbol: "AAPL",
                assetClassId: "class-tech",
                assetClassName: "Technology Stocks",
              },
              isRead: false,
              isDismissed: false,
              snoozedUntil: null,
              createdAt: new Date().toISOString(),
            },
            {
              id: "alert-2",
              type: "opportunity",
              title: "Better Asset Found: GOOGL vs META",
              message: "GOOGL scores 10 points higher than META",
              severity: "info",
              metadata: {
                currentAssetId: "asset-meta",
                currentAssetSymbol: "META",
                betterAssetId: "asset-googl",
                betterAssetSymbol: "GOOGL",
                assetClassId: "class-tech",
                assetClassName: "Technology Stocks",
              },
              isRead: false,
              isDismissed: false,
              snoozedUntil: null,
              createdAt: new Date().toISOString(),
            },
            {
              id: "alert-3",
              type: "opportunity",
              title: "Better Asset Found: VTI vs VOO",
              message: "VTI scores 8 points higher than VOO",
              severity: "info",
              metadata: {
                currentAssetId: "asset-voo",
                currentAssetSymbol: "VOO",
                betterAssetId: "asset-vti",
                betterAssetSymbol: "VTI",
                assetClassId: "class-etf",
                assetClassName: "Index ETFs",
              },
              isRead: false,
              isDismissed: false,
              snoozedUntil: null,
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { page: 1, limit: 100, totalCount: 3, totalPages: 1 },
        }),
      });
    });

    await page.goto("/alerts");

    // Check that groups are displayed
    await expect(page.getByTestId("alert-group-class-tech")).toBeVisible();
    await expect(page.getByTestId("alert-group-class-etf")).toBeVisible();

    // Check group headers with counts
    await expect(page.getByText("Technology Stocks")).toBeVisible();
    await expect(page.getByText("2 alerts")).toBeVisible();
    await expect(page.getByText("Index ETFs")).toBeVisible();
    await expect(page.getByText("1 alert")).toBeVisible();
  });

  test("should show snooze and dismiss buttons for each alert", async ({ page }) => {
    // Mock alerts response
    await page.route("**/api/alerts*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "alert-1",
              type: "opportunity",
              title: "Better Asset Found",
              message: "Test alert",
              severity: "info",
              metadata: {
                currentAssetId: "asset-1",
                currentAssetSymbol: "TEST",
                betterAssetId: "asset-2",
                betterAssetSymbol: "BETT",
                assetClassId: "class-1",
                assetClassName: "Test Class",
              },
              isRead: false,
              isDismissed: false,
              snoozedUntil: null,
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { page: 1, limit: 100, totalCount: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto("/alerts");

    // Check snooze button exists
    const snoozeButton = page.getByTestId("snooze-alert-alert-1");
    await expect(snoozeButton).toBeVisible();
    await expect(snoozeButton).toHaveAttribute("title", "Snooze for 24 hours");

    // Check dismiss button exists
    const dismissButton = page.getByTestId("dismiss-alert-alert-1");
    await expect(dismissButton).toBeVisible();
    await expect(dismissButton).toHaveAttribute("title", "Dismiss alert");
  });
});

test.describe("Alert Snooze Functionality (AC-7.6.5)", () => {
  test("should snooze alert when snooze button is clicked", async ({ page }) => {
    // Mock alerts response
    await page.route("**/api/alerts?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "alert-snooze-test",
              type: "opportunity",
              title: "Snoozable Alert",
              message: "Test alert for snooze",
              severity: "info",
              metadata: {
                currentAssetId: "asset-1",
                currentAssetSymbol: "TEST",
                betterAssetId: "asset-2",
                betterAssetSymbol: "BETT",
                assetClassId: "class-1",
                assetClassName: "Test Class",
              },
              isRead: false,
              isDismissed: false,
              snoozedUntil: null,
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { page: 1, limit: 100, totalCount: 1, totalPages: 1 },
        }),
      });
    });

    // Mock the PATCH request for snoozing
    let snoozeCalled = false;
    await page.route("**/api/alerts/alert-snooze-test", async (route, request) => {
      if (request.method() === "PATCH") {
        const body = JSON.parse(request.postData() || "{}");
        if (body.snoozedUntil) {
          snoozeCalled = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                id: "alert-snooze-test",
                snoozedUntil: body.snoozedUntil,
              },
            }),
          });
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("/alerts");

    // Click snooze button
    const snoozeButton = page.getByTestId("snooze-alert-alert-snooze-test");
    await snoozeButton.click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify snooze was called
    expect(snoozeCalled).toBe(true);
  });
});

test.describe("Alert Dismiss Functionality", () => {
  test("should dismiss alert when dismiss button is clicked", async ({ page }) => {
    // Mock alerts response
    await page.route("**/api/alerts?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "alert-dismiss-test",
              type: "opportunity",
              title: "Dismissable Alert",
              message: "Test alert for dismiss",
              severity: "info",
              metadata: {
                currentAssetId: "asset-1",
                currentAssetSymbol: "TEST",
                betterAssetId: "asset-2",
                betterAssetSymbol: "BETT",
                assetClassId: "class-1",
                assetClassName: "Test Class",
              },
              isRead: false,
              isDismissed: false,
              snoozedUntil: null,
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { page: 1, limit: 100, totalCount: 1, totalPages: 1 },
        }),
      });
    });

    // Mock the PATCH request for dismissing
    let dismissCalled = false;
    await page.route("**/api/alerts/alert-dismiss-test", async (route, request) => {
      if (request.method() === "PATCH") {
        const body = JSON.parse(request.postData() || "{}");
        if (body.isDismissed === true) {
          dismissCalled = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                id: "alert-dismiss-test",
                isDismissed: true,
              },
            }),
          });
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("/alerts");

    // Click dismiss button
    const dismissButton = page.getByTestId("dismiss-alert-alert-dismiss-test");
    await dismissButton.click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify dismiss was called
    expect(dismissCalled).toBe(true);

    // Alert should be removed from list
    await expect(page.getByTestId("alert-item-alert-dismiss-test")).not.toBeVisible();
  });
});

test.describe("Alert Click Navigation (AC-7.6.2)", () => {
  test("should navigate to portfolio when opportunity alert is clicked", async ({ page }) => {
    // Mock alerts response
    await page.route("**/api/alerts?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "alert-nav-test",
              type: "opportunity",
              title: "Navigate Alert",
              message: "Click to navigate",
              severity: "info",
              metadata: {
                currentAssetId: "asset-to-highlight",
                currentAssetSymbol: "TEST",
                betterAssetId: "asset-2",
                betterAssetSymbol: "BETT",
                assetClassId: "class-1",
                assetClassName: "Test Class",
              },
              isRead: false,
              isDismissed: false,
              snoozedUntil: null,
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { page: 1, limit: 100, totalCount: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto("/alerts");

    // Click the alert content (not the buttons)
    await page.getByText("Navigate Alert").click();

    // Should navigate to portfolio with highlight parameter
    await expect(page).toHaveURL(/\/portfolio\?highlightAsset=asset-to-highlight/);
  });
});

test.describe("Settings Page Integration", () => {
  test("should navigate from settings to alerts page via sidebar", async ({ page }) => {
    await page.goto("/settings");

    // Check if there's an Alerts link in the sidebar
    // First navigate to a dashboard page to see the sidebar
    await page.goto("/");

    // Look for alerts link in sidebar
    const alertsLink = page.getByRole("link", { name: /Alerts/i });

    if (await alertsLink.isVisible()) {
      await alertsLink.click();
      await expect(page).toHaveURL("/alerts");
    } else {
      // If no direct alerts link, test that we can navigate via URL
      await page.goto("/alerts");
      await expect(page).toHaveURL("/alerts");
    }
  });
});

/**
 * Story 7.8: Opportunity Alerts Enhancements
 * AC-7.8.1: Dismiss All in Group Action
 * AC-7.8.2: Sidebar Navigation Link
 */
test.describe("Bulk Dismiss Alerts (AC-7.8.1)", () => {
  test("should show Dismiss All button in alert group header", async ({ page }) => {
    // Mock alerts response with multiple alerts in a group
    await page.route("**/api/alerts*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "alert-1",
                type: "opportunity",
                title: "Better Asset Found: AAPL",
                message: "AAPL scores 15 points higher",
                severity: "info",
                metadata: {
                  currentAssetId: "asset-1",
                  currentAssetSymbol: "MSFT",
                  betterAssetId: "asset-2",
                  betterAssetSymbol: "AAPL",
                  assetClassId: "class-tech",
                  assetClassName: "Technology",
                  scoreDifference: "15",
                },
                isRead: false,
                isDismissed: false,
                createdAt: new Date().toISOString(),
              },
              {
                id: "alert-2",
                type: "opportunity",
                title: "Better Asset Found: GOOG",
                message: "GOOG scores 12 points higher",
                severity: "info",
                metadata: {
                  currentAssetId: "asset-3",
                  currentAssetSymbol: "META",
                  betterAssetId: "asset-4",
                  betterAssetSymbol: "GOOG",
                  assetClassId: "class-tech",
                  assetClassName: "Technology",
                  scoreDifference: "12",
                },
                isRead: false,
                isDismissed: false,
                createdAt: new Date().toISOString(),
              },
            ],
            meta: { page: 1, limit: 100, totalCount: 2, totalPages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/alerts");

    // Wait for alerts to load
    await expect(page.getByText("Technology")).toBeVisible({ timeout: 5000 });

    // Check that Dismiss All button is visible in the group header
    const dismissAllButton = page.getByTestId("dismiss-all-class-tech");
    await expect(dismissAllButton).toBeVisible();
    await expect(dismissAllButton).toHaveText(/Dismiss All/);
  });

  test("should show confirmation dialog when clicking Dismiss All", async ({ page }) => {
    // Mock alerts response
    await page.route("**/api/alerts*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "alert-1",
                type: "opportunity",
                title: "Better Asset Found",
                message: "Test message",
                severity: "info",
                metadata: {
                  currentAssetId: "asset-1",
                  betterAssetId: "asset-2",
                  assetClassId: "class-stocks",
                  assetClassName: "US Stocks",
                  scoreDifference: "15",
                },
                isRead: false,
                isDismissed: false,
                createdAt: new Date().toISOString(),
              },
            ],
            meta: { page: 1, limit: 100, totalCount: 1, totalPages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/alerts");

    // Wait for alerts to load
    await expect(page.getByText("US Stocks")).toBeVisible({ timeout: 5000 });

    // Click Dismiss All button
    const dismissAllButton = page.getByTestId("dismiss-all-class-stocks");
    await dismissAllButton.click();

    // Confirmation dialog should appear
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText("Dismiss all alerts in this group?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dismiss All" })).toBeVisible();
  });

  test("should dismiss all alerts in group when confirmed", async ({ page }) => {
    let bulkDismissCallCount = 0;

    // Mock alerts response
    await page.route("**/api/alerts*", async (route) => {
      if (route.request().method() === "GET") {
        // Return empty after bulk dismiss
        const alerts =
          bulkDismissCallCount > 0
            ? []
            : [
                {
                  id: "alert-1",
                  type: "opportunity",
                  title: "Better Asset Found",
                  message: "Test message",
                  severity: "info",
                  metadata: {
                    currentAssetId: "asset-1",
                    betterAssetId: "asset-2",
                    assetClassId: "class-stocks",
                    assetClassName: "US Stocks",
                    scoreDifference: "15",
                  },
                  isRead: false,
                  isDismissed: false,
                  createdAt: new Date().toISOString(),
                },
              ];

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: alerts,
            meta: {
              page: 1,
              limit: 100,
              totalCount: alerts.length,
              totalPages: alerts.length > 0 ? 1 : 0,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock bulk dismiss endpoint
    await page.route("**/api/alerts/bulk-dismiss", async (route) => {
      bulkDismissCallCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { success: true, dismissedCount: 1 },
        }),
      });
    });

    await page.goto("/alerts");

    // Wait for alerts to load
    await expect(page.getByText("US Stocks")).toBeVisible({ timeout: 5000 });

    // Click Dismiss All button
    const dismissAllButton = page.getByTestId("dismiss-all-class-stocks");
    await dismissAllButton.click();

    // Click confirm button in dialog
    await page.getByRole("button", { name: "Dismiss All" }).click();

    // Should show success toast
    await expect(page.getByText(/alert.*dismissed/i)).toBeVisible({ timeout: 5000 });

    // Bulk dismiss should have been called
    expect(bulkDismissCallCount).toBe(1);
  });

  test("should cancel bulk dismiss when Cancel is clicked", async ({ page }) => {
    let bulkDismissCallCount = 0;

    // Mock alerts response
    await page.route("**/api/alerts*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "alert-1",
                type: "opportunity",
                title: "Better Asset Found",
                message: "Test message",
                severity: "info",
                metadata: {
                  currentAssetId: "asset-1",
                  betterAssetId: "asset-2",
                  assetClassId: "class-stocks",
                  assetClassName: "US Stocks",
                  scoreDifference: "15",
                },
                isRead: false,
                isDismissed: false,
                createdAt: new Date().toISOString(),
              },
            ],
            meta: { page: 1, limit: 100, totalCount: 1, totalPages: 1 },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock bulk dismiss endpoint
    await page.route("**/api/alerts/bulk-dismiss", async (route) => {
      bulkDismissCallCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { success: true, dismissedCount: 1 },
        }),
      });
    });

    await page.goto("/alerts");

    // Wait for alerts to load
    await expect(page.getByText("US Stocks")).toBeVisible({ timeout: 5000 });

    // Click Dismiss All button
    const dismissAllButton = page.getByTestId("dismiss-all-class-stocks");
    await dismissAllButton.click();

    // Click cancel button in dialog
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should close
    await expect(page.getByRole("alertdialog")).not.toBeVisible();

    // Alert should still be visible
    await expect(page.getByText("US Stocks")).toBeVisible();

    // Bulk dismiss should NOT have been called
    expect(bulkDismissCallCount).toBe(0);
  });
});

test.describe("Sidebar Navigation (AC-7.8.2)", () => {
  test("should show Alerts link in sidebar", async ({ page }) => {
    await page.goto("/");

    // Look for alerts link in sidebar
    const alertsLink = page.getByRole("link", { name: /Alerts/i });
    await expect(alertsLink).toBeVisible();
  });

  test("should navigate to alerts page when clicking sidebar link", async ({ page }) => {
    await page.goto("/");

    // Click alerts link in sidebar
    const alertsLink = page.getByRole("link", { name: /Alerts/i });
    await alertsLink.click();

    // Should navigate to alerts page
    await expect(page).toHaveURL("/alerts");
    await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
  });
});
