/**
 * Scoring Criteria E2E Tests
 *
 * Story 4.3: Scoring Criteria Creation
 * Story 5.1: Define Scoring Criteria
 * Story 5.4: Criteria Library View
 * Story 5.5: Copy Criteria Set
 * Story 5.6: Compare Criteria Sets
 *
 * Tests for criteria management page and functionality.
 * AC-4.3.1: View Criteria Sets - List of criteria sets organized by asset type
 * AC-4.3.2: Add New Criterion - Form with name, metric, operator, value, points
 * AC-4.3.3: Select Operator - Dynamic value fields based on operator selection
 * AC-4.3.4: Define Criterion with Points - Points assignment (-100 to +100)
 * AC-4.3.5: Points Range Validation - Enforce valid points range
 * AC-4.3.6: Criteria Priority Ordering - Drag and drop reordering
 * AC-4.3.7: Create Criteria Set for Market/Asset Type
 * AC-4.3.8: Edit Existing Criterion
 * AC-4.3.9: Delete Criterion
 * AC-4.3.10: Criteria Versioning (Immutable)
 */

import { test, expect } from "@playwright/test";

// Test user credentials - should match a verified test user
const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword1!",
};

/**
 * Check if @data-setup tests should run
 * Set RUN_DATA_SETUP_TESTS=true to enable these tests
 */
const SKIP_DATA_SETUP_TESTS = !process.env.RUN_DATA_SETUP_TESTS;

/**
 * Helper to login before each test
 */
async function loginUser(page: import("@playwright/test").Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(TEST_USER.email);
  await page.locator('input[name="password"]').fill(TEST_USER.password);
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|portfolio)?$/);
}

// =============================================================================
// CRITERIA PAGE ACCESS TESTS
// =============================================================================

test.describe("Criteria Page Access", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/criteria");

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/login\?redirect=\/criteria/);
  });

  test("should show criteria page when authenticated", async ({ page }) => {
    await loginUser(page);
    await page.goto("/criteria");

    // Check page title
    await expect(page.getByRole("heading", { name: "Scoring Criteria" })).toBeVisible();
  });

  test("should have Criteria link in navigation sidebar", async ({ page }) => {
    await loginUser(page);

    // Check for Criteria link in sidebar
    const criteriaLink = page.getByRole("link", { name: "Criteria" });
    await expect(criteriaLink).toBeVisible();
  });

  test("should navigate to Criteria page from sidebar", async ({ page }) => {
    await loginUser(page);
    await page.goto("/");

    // Click Criteria in sidebar
    await page.getByRole("link", { name: "Criteria" }).click();

    // Should navigate to criteria page
    await expect(page).toHaveURL("/criteria");
    await expect(page.getByRole("heading", { name: "Scoring Criteria" })).toBeVisible();
  });
});

// =============================================================================
// CRITERIA SET VIEWING TESTS (AC-4.3.1)
// =============================================================================

test.describe("View Criteria Sets (AC-4.3.1)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/criteria");
  });

  test("should display Scoring Criteria page header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Scoring Criteria" })).toBeVisible();
    await expect(
      page.getByText("Define criteria to score and rank your investment opportunities")
    ).toBeVisible();
  });

  test("should show Create Criteria Set button", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await expect(createButton).toBeVisible();
  });

  test("should show empty state when no criteria exist", async ({ page }) => {
    // Check for empty state message (if user has no criteria sets)
    const emptyState = page.getByText("No Criteria Sets");
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(
        page.getByText("Get started by creating your first scoring criteria set")
      ).toBeVisible();
    }
  });

  test("should show asset type filter dropdown", async ({ page }) => {
    // Look for the asset type filter
    const filterSelect = page.getByRole("combobox").first();
    await expect(filterSelect).toBeVisible();
  });

  test("should show search input for criteria sets", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search criteria sets");
    await expect(searchInput).toBeVisible();
  });
});

// =============================================================================
// CREATE CRITERIA SET TESTS (AC-4.3.7)
// =============================================================================

test.describe("Create Criteria Set (AC-4.3.7)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/criteria");
  });

  test("should open create dialog when clicking Create Criteria Set", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    // Dialog should appear
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create Criteria Set" })).toBeVisible();
  });

  test("should show required form fields in create dialog", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    // Check for form fields
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Asset Type")).toBeVisible();
    await expect(page.getByLabel("Target Market")).toBeVisible();
  });

  test("should create criteria set with valid data", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    // Fill in the form
    const uniqueName = `Test Criteria Set ${Date.now()}`;
    await page.getByLabel("Name").fill(uniqueName);

    // Select asset type
    await page.getByLabel("Asset Type").click();
    await page.getByRole("option", { name: "Stock" }).click();

    // Select target market
    await page.getByLabel("Target Market").click();
    await page
      .getByRole("option", { name: /Brazil/i })
      .first()
      .click();

    // Submit
    await page
      .getByRole("button", { name: /Create Criteria Set/i })
      .last()
      .click();

    // Should show success (dialog closes, new set appears)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  });

  test("should close dialog when clicking Cancel", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    // Dialog should be visible
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("should require name field", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    // Don't fill name, try to submit
    await page.getByLabel("Asset Type").click();
    await page.getByRole("option", { name: "Stock" }).click();
    await page.getByLabel("Target Market").click();
    await page
      .getByRole("option", { name: /Brazil/i })
      .first()
      .click();

    await page
      .getByRole("button", { name: /Create Criteria Set/i })
      .last()
      .click();

    // Should show validation error
    await expect(page.getByText("Name is required")).toBeVisible();
  });
});

// =============================================================================
// ADD CRITERION TESTS (AC-4.3.2, AC-4.3.3, AC-4.3.4, AC-4.3.5)
// =============================================================================

test.describe("Add Criterion (AC-4.3.2)", () => {
  /**
   * @data-setup: Requires at least one criteria set to exist
   */
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/criteria");
  });

  test(
    "should show Add Criterion button inside criteria set",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least one criteria set"
      );

      // Wait for criteria sets to load
      await page.waitForSelector('[data-testid="criteria-set-card"]', { timeout: 10000 });

      // Look for Add Criterion button
      const addButton = page.getByRole("button", { name: /Add Criterion/i }).first();
      await expect(addButton).toBeVisible();
    }
  );

  test(
    "should open criterion form when clicking Add Criterion",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least one criteria set"
      );

      const addButton = page.getByRole("button", { name: /Add Criterion/i }).first();
      await addButton.click();

      // Dialog should appear with form fields
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByLabel("Name")).toBeVisible();
      await expect(page.getByLabel(/Metric|Data Field/)).toBeVisible();
      await expect(page.getByLabel("Operator")).toBeVisible();
    }
  );

  test(
    "should show dynamic value fields based on operator selection (AC-4.3.3)",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least one criteria set"
      );

      const addButton = page.getByRole("button", { name: /Add Criterion/i }).first();
      await addButton.click();

      // Select "between" operator
      await page.getByLabel("Operator").click();
      await page.getByRole("option", { name: /between/i }).click();

      // Should show two value fields for "between"
      await expect(page.getByLabel("Min Value")).toBeVisible();
      await expect(page.getByLabel("Max Value")).toBeVisible();
    }
  );

  test(
    "should show points field with validation (AC-4.3.4, AC-4.3.5)",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least one criteria set"
      );

      const addButton = page.getByRole("button", { name: /Add Criterion/i }).first();
      await addButton.click();

      // Points field should be visible
      const pointsInput = page.getByLabel("Points");
      await expect(pointsInput).toBeVisible();

      // Should show description about valid range
      await expect(page.getByText(/-100/)).toBeVisible();
      await expect(page.getByText(/\+?100/)).toBeVisible();
    }
  );
});

// =============================================================================
// EDIT CRITERION TESTS (AC-4.3.8)
// =============================================================================

test.describe("Edit Criterion (AC-4.3.8)", () => {
  /**
   * @data-setup: Requires criteria set with at least one criterion
   */
  test(
    "should show edit button on criterion card",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and criteria with criterion"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Wait for criteria to load
      await page.waitForSelector('[data-testid="criterion-card"]', { timeout: 10000 });

      // Look for edit button
      const editButton = page
        .locator('[data-testid="criterion-card"]')
        .first()
        .locator("[aria-label='Edit']");
      await expect(editButton).toBeVisible();
    }
  );

  test(
    "should open edit dialog with existing values",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and criteria with criterion"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Click edit on first criterion
      const editButton = page
        .locator('[data-testid="criterion-card"]')
        .first()
        .locator("[aria-label='Edit']");
      await editButton.click();

      // Dialog should appear with Edit title
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Edit Criterion" })).toBeVisible();

      // Name field should have existing value
      const nameInput = page.getByLabel("Name");
      await expect(nameInput).toHaveValue(/.+/);
    }
  );
});

// =============================================================================
// DELETE CRITERION TESTS (AC-4.3.9)
// =============================================================================

test.describe("Delete Criterion (AC-4.3.9)", () => {
  /**
   * @data-setup: Requires criteria set with at least one criterion
   */
  test(
    "should show delete button on criterion card",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and criteria with criterion"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Wait for criteria to load
      await page.waitForSelector('[data-testid="criterion-card"]', { timeout: 10000 });

      // Look for delete button
      const deleteButton = page
        .locator('[data-testid="criterion-card"]')
        .first()
        .locator("[aria-label='Delete']");
      await expect(deleteButton).toBeVisible();
    }
  );

  test(
    "should show confirmation dialog when clicking delete",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and criteria with criterion"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Click delete on first criterion
      const deleteButton = page
        .locator('[data-testid="criterion-card"]')
        .first()
        .locator("[aria-label='Delete']");
      await deleteButton.click();

      // Confirmation dialog should appear
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expect(page.getByText(/Delete Criterion/)).toBeVisible();
    }
  );
});

// =============================================================================
// DRAG AND DROP REORDERING TESTS (AC-4.3.6)
// =============================================================================

test.describe("Criteria Priority Ordering (AC-4.3.6)", () => {
  /**
   * @data-setup: Requires criteria set with at least two criteria
   */
  test(
    "should show drag handle on criterion cards",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and criteria set with multiple criteria"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Wait for criteria to load
      await page.waitForSelector('[data-testid="criterion-card"]', { timeout: 10000 });

      // Look for drag handle (GripVertical icon)
      const dragHandle = page
        .locator('[data-testid="criterion-card"]')
        .first()
        .locator("[data-drag-handle]");
      await expect(dragHandle).toBeVisible();
    }
  );
});

// =============================================================================
// CRITERIA VERSIONING TESTS (AC-4.3.10)
// =============================================================================

test.describe("Criteria Versioning (AC-4.3.10)", () => {
  /**
   * @data-setup: Requires at least one criteria set
   */
  test(
    "should display version number on criteria set",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least one criteria set"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Wait for criteria sets to load
      await page.waitForSelector('[data-testid="criteria-set-card"]', { timeout: 10000 });

      // Look for version badge
      await expect(page.getByText(/Version \d+|v\d+/i).first()).toBeVisible();
    }
  );

  test(
    "should display Active badge on active criteria sets",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least one active criteria set"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Wait for criteria sets to load
      await page.waitForSelector('[data-testid="criteria-set-card"]', { timeout: 10000 });

      // Look for Active badge
      await expect(page.getByText("Active").first()).toBeVisible();
    }
  );
});

// =============================================================================
// COPY CRITERIA SET TESTS (Story 5.5)
// =============================================================================

test.describe("Copy Criteria Set (Story 5.5)", () => {
  /**
   * @data-setup: Requires at least one criteria set
   */
  test(
    "should show copy option in criteria set menu",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least one criteria set"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Wait for criteria sets to load
      await page.waitForSelector('[data-testid="criteria-set-card"]', { timeout: 10000 });

      // Open menu
      const menuButton = page
        .locator('[data-testid="criteria-set-card"]')
        .first()
        .locator("button")
        .last();
      await menuButton.click();

      // Look for Copy option
      await expect(page.getByRole("menuitem", { name: /Copy/i })).toBeVisible();
    }
  );
});

// =============================================================================
// DELETE CRITERIA SET TESTS (Story 4.4 - AC-4.4.4)
// =============================================================================

test.describe("Delete Criteria Set with Confirmation (AC-4.4.4)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/criteria");
  });

  test("should show delete option in criteria set menu", async ({ page }) => {
    // Create a test criteria set first
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    // Fill in the form
    const uniqueName = `Delete Test Set ${Date.now()}`;
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Asset Type").click();
    await page.getByRole("option", { name: "Stock" }).click();
    await page.getByLabel("Target Market").click();
    await page
      .getByRole("option", { name: /Brazil/i })
      .first()
      .click();

    // Submit
    await page
      .getByRole("button", { name: /Create Criteria Set/i })
      .last()
      .click();

    // Wait for dialog to close and set to appear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });

    // Find the menu button for this set
    const setCard = page.locator("div").filter({ hasText: uniqueName }).first();
    const menuButton = setCard.locator("button").filter({ hasText: "" }).last();
    await menuButton.click();

    // Look for Delete option
    await expect(page.getByRole("menuitem", { name: /Delete/i })).toBeVisible();
  });

  test("should show confirmation dialog when clicking delete", async ({ page }) => {
    // Create a test criteria set first
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    const uniqueName = `Delete Confirm Test ${Date.now()}`;
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Asset Type").click();
    await page.getByRole("option", { name: "Stock" }).click();
    await page.getByLabel("Target Market").click();
    await page
      .getByRole("option", { name: /Brazil/i })
      .first()
      .click();
    await page
      .getByRole("button", { name: /Create Criteria Set/i })
      .last()
      .click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });

    // Open menu and click delete
    const setCard = page.locator("div").filter({ hasText: uniqueName }).first();
    const menuButton = setCard.locator("button").filter({ hasText: "" }).last();
    await menuButton.click();
    await page.getByRole("menuitem", { name: /Delete/i }).click();

    // Confirmation dialog should appear
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/Delete Criteria Set/)).toBeVisible();
    await expect(page.getByText(/cannot be undone/)).toBeVisible();
  });

  test("should close confirmation dialog when clicking cancel", async ({ page }) => {
    // Create a test criteria set first
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    const uniqueName = `Cancel Delete Test ${Date.now()}`;
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Asset Type").click();
    await page.getByRole("option", { name: "Stock" }).click();
    await page.getByLabel("Target Market").click();
    await page
      .getByRole("option", { name: /Brazil/i })
      .first()
      .click();
    await page
      .getByRole("button", { name: /Create Criteria Set/i })
      .last()
      .click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });

    // Open menu and click delete
    const setCard = page.locator("div").filter({ hasText: uniqueName }).first();
    const menuButton = setCard.locator("button").filter({ hasText: "" }).last();
    await menuButton.click();
    await page.getByRole("menuitem", { name: /Delete/i }).click();

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should close
    await expect(page.getByRole("alertdialog")).not.toBeVisible();

    // Criteria set should still exist
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test(
    "should delete criteria set when confirming",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true - actually deletes data"
      );

      // Create a test criteria set first
      const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
      await createButton.click();

      const uniqueName = `Confirm Delete Test ${Date.now()}`;
      await page.getByLabel("Name").fill(uniqueName);
      await page.getByLabel("Asset Type").click();
      await page.getByRole("option", { name: "Stock" }).click();
      await page.getByLabel("Target Market").click();
      await page
        .getByRole("option", { name: /Brazil/i })
        .first()
        .click();
      await page
        .getByRole("button", { name: /Create Criteria Set/i })
        .last()
        .click();

      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });

      // Open menu and click delete
      const setCard = page.locator("div").filter({ hasText: uniqueName }).first();
      const menuButton = setCard.locator("button").filter({ hasText: "" }).last();
      await menuButton.click();
      await page.getByRole("menuitem", { name: /Delete/i }).click();

      // Click Delete to confirm
      await page.getByRole("button", { name: "Delete" }).click();

      // Dialog should close and criteria set should be removed
      await expect(page.getByRole("alertdialog")).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByText(uniqueName)).not.toBeVisible({ timeout: 10000 });
    }
  );
});

// =============================================================================
// COMPARE CRITERIA SETS TESTS (Story 5.6)
// =============================================================================

test.describe("Compare Criteria Sets (Story 5.6)", () => {
  /**
   * @data-setup: Requires at least two criteria sets
   */
  test(
    "should show Compare button when multiple criteria sets exist",
    {
      tag: "@data-setup",
    },
    async ({ page }) => {
      test.skip(
        SKIP_DATA_SETUP_TESTS,
        "Requires RUN_DATA_SETUP_TESTS=true and at least two criteria sets"
      );

      await loginUser(page);
      await page.goto("/criteria");

      // Wait for criteria sets to load
      const cards = page.locator('[data-testid="criteria-set-card"]');
      const count = await cards.count();

      if (count >= 2) {
        // Look for Compare button
        await expect(page.getByRole("button", { name: /Compare/i })).toBeVisible();
      }
    }
  );
});

// =============================================================================
// FILTER AND SEARCH TESTS (Story 5.4)
// =============================================================================

test.describe("Filter and Search Criteria (Story 5.4)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/criteria");
  });

  test("should filter by asset type", async ({ page }) => {
    // Click on asset type filter
    const filterSelect = page.getByRole("combobox").first();
    await filterSelect.click();

    // Should show asset type options
    await expect(page.getByRole("option", { name: /Stock/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /REIT/i })).toBeVisible();
  });

  test("should search criteria sets by name", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search criteria sets");

    // Type search query
    await searchInput.fill("test");

    // Search should be applied (results filtered)
    // This is a basic test - actual filtering depends on data
    await expect(searchInput).toHaveValue("test");
  });

  test("should clear search when clicking clear button", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search criteria sets");

    // Type search query
    await searchInput.fill("test");
    await expect(searchInput).toHaveValue("test");

    // Clear the input
    await searchInput.clear();
    await expect(searchInput).toHaveValue("");
  });
});

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

test.describe("Criteria Page Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/criteria");
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    // Main heading should be h1 or h2
    const mainHeading = page.getByRole("heading", { name: "Scoring Criteria" });
    await expect(mainHeading).toBeVisible();
  });

  test("should have accessible form labels in create dialog", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /Create Criteria Set/i });
    await createButton.click();

    // Form fields should have associated labels
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute("id");
  });

  test("should support keyboard navigation", async ({ page }) => {
    // Tab to Create button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should be able to activate with Enter
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});
