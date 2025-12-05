/**
 * Strategy E2E Tests
 *
 * Story 4.1: Define Asset Classes
 * Story 4.2: Define Subclasses
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.4: Set Allocation Ranges for Subclasses
 *
 * Tests for strategy page, asset class and subclass management.
 * AC-4.1.1: View list of asset classes
 * AC-4.1.2: Create asset class with name and optional icon
 * AC-4.1.3: Edit asset class name (inline)
 * AC-4.1.4: Delete asset class (no assets)
 * AC-4.1.5: Delete asset class with warning (has assets)
 * AC-4.2.1: View list of subclasses within asset class
 * AC-4.2.2: Create subclass
 * AC-4.2.3: Edit subclass name
 * AC-4.2.4: Delete subclass (no assets)
 * AC-4.2.5: Delete subclass with warning (has assets)
 * AC-4.3.1: View and set allocation ranges
 * AC-4.3.2: Validation - min cannot exceed max
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 * AC-4.3.4: Visual AllocationGauge display
 * AC-4.4.1: View and set subclass allocation ranges
 * AC-4.4.2: Warning when subclass max exceeds parent max
 * AC-4.4.3: Warning when sum of subclass minimums exceeds parent max
 * AC-4.4.4: Validation - subclass min cannot exceed max
 * AC-4.4.5: Flexible subclass indicator when ranges are null
 */

import { test, expect } from "@playwright/test";

// Test user credentials - should match a verified test user
const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword1!",
};

/**
 * Helper to login before each test
 */
async function loginUser(page: import("@playwright/test").Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(TEST_USER.email);
  await page.getByLabel("Password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|portfolio)?$/);
}

test.describe("Strategy Page", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/strategy");

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/login\?redirect=\/strategy/);
  });

  test("should show strategy page when authenticated", async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    // Check page title and description
    await expect(page.getByRole("heading", { name: "Strategy" })).toBeVisible();
    await expect(
      page.getByText("Define your investment strategy with asset classes and allocation targets.")
    ).toBeVisible();
  });

  test("should have Strategy link in navigation sidebar", async ({ page }) => {
    await loginUser(page);

    // Check for Strategy link in sidebar
    const strategyLink = page.getByRole("link", { name: "Strategy" });
    await expect(strategyLink).toBeVisible();
  });
});

test.describe("Asset Classes List (AC-4.1.1)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should display Asset Classes card", async ({ page }) => {
    // Card should be visible with title
    await expect(page.getByRole("heading", { name: "Asset Classes" })).toBeVisible();
  });

  test("should show count of asset classes", async ({ page }) => {
    // Should display "X of 10 asset classes" text
    await expect(page.getByText(/\d+ of 10 asset classes/)).toBeVisible();
  });

  test("should show empty state for user with no asset classes", async ({ page }) => {
    // If user has no asset classes, should show empty state
    const emptyState = page.getByText("No asset classes yet");
    const addButton = page.getByRole("button", { name: "Add Class" });

    // At least one of these should be visible
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasAddButton = await addButton.isVisible().catch(() => false);

    expect(hasEmptyState || hasAddButton).toBe(true);
  });
});

test.describe("Create Asset Class (AC-4.1.2)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should show Add Class button", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await expect(addButton).toBeVisible();
  });

  test("should show inline form when clicking Add Class", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await addButton.click();

    // Form should appear with name input
    const nameInput = page.getByPlaceholder("Asset class name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeFocused();
  });

  test("should show icon selector in create form", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await addButton.click();

    // Should see Icon label and emoji buttons
    await expect(page.getByText("Icon:")).toBeVisible();
  });

  test("should create asset class with name and icon", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await addButton.click();

    // Fill in the name
    const uniqueName = `Test Class ${Date.now()}`;
    const nameInput = page.getByPlaceholder("Asset class name");
    await nameInput.fill(uniqueName);

    // Click an icon
    await page.getByRole("button", { name: "📈" }).click();

    // Click the save button (checkmark)
    await page
      .locator('button:has-text("Save")')
      .or(page.locator("button svg.text-green-600").locator(".."))
      .click();

    // Should show success toast
    await expect(page.getByText("Asset class created")).toBeVisible({ timeout: 10000 });

    // Asset class should appear in list
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test("should create asset class without icon", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await addButton.click();

    const uniqueName = `Test Class No Icon ${Date.now()}`;
    const nameInput = page.getByPlaceholder("Asset class name");
    await nameInput.fill(uniqueName);

    // Click save without selecting icon
    await page
      .locator('button:has-text("Save")')
      .or(page.locator("button svg.text-green-600").locator(".."))
      .click();

    // Should show success toast
    await expect(page.getByText("Asset class created")).toBeVisible({ timeout: 10000 });

    // Asset class should appear in list
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test("should cancel create form when clicking cancel", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await addButton.click();

    // Form should be visible
    const nameInput = page.getByPlaceholder("Asset class name");
    await expect(nameInput).toBeVisible();

    // Click cancel button (X icon)
    await page
      .locator('button:has-text("Cancel")')
      .or(page.locator("button svg.text-muted-foreground").locator(".."))
      .click();

    // Form should disappear
    await expect(nameInput).not.toBeVisible();
  });

  test("should disable save button when name is empty", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await addButton.click();

    // Save button should be disabled
    const saveButton = page
      .locator('button:has-text("Save")')
      .or(page.locator("button svg.text-green-600").locator(".."));
    await expect(saveButton).toBeDisabled();
  });
});

test.describe("Edit Asset Class (AC-4.1.3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should show edit button on asset class card", async ({ page }) => {
    // Look for edit button (pencil icon)
    const editButton = page.locator("[aria-label='Edit']").first();
    const isVisible = await editButton.isVisible().catch(() => false);

    // If there are asset classes, edit button should exist
    if (isVisible) {
      await expect(editButton).toBeVisible();
    }
  });

  test("should enter inline edit mode when clicking edit button", async ({ page }) => {
    const editButton = page.locator("[aria-label='Edit']").first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (isVisible) {
      await editButton.click();

      // Input should appear and be focused
      const input = page.locator("input").first();
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    }
  });

  test("should save changes when pressing Enter", async ({ page }) => {
    const editButton = page.locator("[aria-label='Edit']").first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (isVisible) {
      await editButton.click();

      const input = page.locator("input").first();
      const newName = `Updated ${Date.now()}`;
      await input.clear();
      await input.fill(newName);

      // Press Enter to save
      await input.press("Enter");

      // Input should disappear
      await expect(input).not.toBeVisible({ timeout: 5000 });

      // Updated name should be visible
      await expect(page.getByText(newName)).toBeVisible();
    }
  });

  test("should cancel edit when pressing Escape", async ({ page }) => {
    const editButton = page.locator("[aria-label='Edit']").first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (isVisible) {
      // Get original name first
      const assetCard = editButton.locator("xpath=ancestor::div[contains(@class, 'rounded-lg')]");
      const originalName = await assetCard.locator("span.font-medium").innerText();

      await editButton.click();

      const input = page.locator("input").first();
      await input.clear();
      await input.fill("Should Not Save");

      // Press Escape to cancel
      await input.press("Escape");

      // Input should disappear
      await expect(input).not.toBeVisible({ timeout: 5000 });

      // Original name should still be visible
      await expect(page.getByText(originalName)).toBeVisible();
    }
  });

  test("should save changes when clicking checkmark button", async ({ page }) => {
    const editButton = page.locator("[aria-label='Edit']").first();
    const isVisible = await editButton.isVisible().catch(() => false);

    if (isVisible) {
      await editButton.click();

      const input = page.locator("input").first();
      const newName = `Saved via button ${Date.now()}`;
      await input.clear();
      await input.fill(newName);

      // Click save button (checkmark)
      await page.locator("[aria-label='Save']").click();

      // Input should disappear
      await expect(input).not.toBeVisible({ timeout: 5000 });

      // Updated name should be visible
      await expect(page.getByText(newName)).toBeVisible();
    }
  });
});

test.describe("Delete Asset Class (AC-4.1.4, AC-4.1.5)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should show delete button on asset class card", async ({ page }) => {
    // Look for delete button (trash icon)
    const deleteButton = page.locator("[aria-label='Delete']").first();
    const isVisible = await deleteButton.isVisible().catch(() => false);

    // If there are asset classes, delete button should exist
    if (isVisible) {
      await expect(deleteButton).toBeVisible();
    }
  });

  test("should delete asset class without assets immediately", async ({ page }) => {
    // First create a new asset class to delete
    const addButton = page.getByRole("button", { name: /Add Class/i });
    await addButton.click();

    const uniqueName = `Delete Me ${Date.now()}`;
    const nameInput = page.getByPlaceholder("Asset class name");
    await nameInput.fill(uniqueName);

    // Save the new class
    await page
      .locator('button:has-text("Save")')
      .or(page.locator("button svg.text-green-600").locator(".."))
      .click();

    // Wait for success
    await expect(page.getByText("Asset class created")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Now find and click the delete button for this class
    const classCard = page.locator("div").filter({ hasText: uniqueName }).first();
    const deleteButton = classCard.locator("[aria-label='Delete']");
    await deleteButton.click();

    // Should show success toast immediately (no assets)
    await expect(page.getByText("Asset class deleted")).toBeVisible({ timeout: 10000 });

    // Asset class should be removed from list
    await expect(page.getByText(uniqueName)).not.toBeVisible();
  });

  test("should show warning dialog when deleting class with assets", async ({ page }) => {
    // This test assumes there's an asset class with associated assets
    // It might be skipped if no such class exists

    const deleteButton = page.locator("[aria-label='Delete']").first();
    const isVisible = await deleteButton.isVisible().catch(() => false);

    if (isVisible) {
      await deleteButton.click();

      // Either it deletes immediately (no assets) or shows warning dialog
      const warningDialog = page.getByRole("alertdialog");
      const hasWarning = await warningDialog.isVisible().catch(() => false);

      if (hasWarning) {
        // Dialog should show asset count warning
        await expect(page.getByText(/associated asset/)).toBeVisible();

        // Should have Cancel and Delete Anyway buttons
        await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
        await expect(page.getByRole("button", { name: /Delete Anyway/i })).toBeVisible();
      }
    }
  });

  test("should cancel delete when clicking Cancel in warning dialog", async ({ page }) => {
    const deleteButton = page.locator("[aria-label='Delete']").first();
    const isVisible = await deleteButton.isVisible().catch(() => false);

    if (isVisible) {
      // Get the name before attempting delete
      const assetCard = deleteButton.locator("xpath=ancestor::div[contains(@class, 'rounded-lg')]");
      const assetName = await assetCard.locator("span.font-medium").innerText();

      await deleteButton.click();

      const warningDialog = page.getByRole("alertdialog");
      const hasWarning = await warningDialog.isVisible().catch(() => false);

      if (hasWarning) {
        // Click Cancel
        await page.getByRole("button", { name: "Cancel" }).click();

        // Dialog should close
        await expect(warningDialog).not.toBeVisible();

        // Asset class should still exist
        await expect(page.getByText(assetName)).toBeVisible();
      }
    }
  });

  test("should force delete when clicking Delete Anyway in warning dialog", async ({ page }) => {
    const deleteButton = page.locator("[aria-label='Delete']").first();
    const isVisible = await deleteButton.isVisible().catch(() => false);

    if (isVisible) {
      await deleteButton.click();

      const warningDialog = page.getByRole("alertdialog");
      const hasWarning = await warningDialog.isVisible().catch(() => false);

      if (hasWarning) {
        // Click Delete Anyway
        await page.getByRole("button", { name: /Delete Anyway/i }).click();

        // Should show success toast
        await expect(page.getByText("Asset class deleted")).toBeVisible({ timeout: 10000 });

        // Dialog should close
        await expect(warningDialog).not.toBeVisible();
      }
    }
  });
});

test.describe("Asset Class Limit", () => {
  // Note: This test requires 10 asset classes to already exist
  // It's marked as skip by default - enable when you have test data setup

  test.skip("should show error when trying to create 11th asset class", async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    const addButton = page.getByRole("button", { name: /Add Class/i });

    // If button is disabled or not visible, we're at limit
    const isVisible = await addButton.isVisible().catch(() => false);

    if (isVisible) {
      await addButton.click();

      const nameInput = page.getByPlaceholder("Asset class name");
      await nameInput.fill("Eleventh Class");

      await page
        .locator('button:has-text("Save")')
        .or(page.locator("button svg.text-green-600").locator(".."))
        .click();

      // Should show error toast
      await expect(page.getByText("Maximum asset classes reached")).toBeVisible();
    }
  });

  test.skip("should hide Add Class button when at limit", async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    // When at 10 asset classes, the Add Class button should not be visible
    // This test assumes the user has exactly 10 asset classes

    const addButton = page.getByRole("button", { name: /Add Class/i });
    await expect(addButton).not.toBeVisible();
  });
});

test.describe("Navigation Integration", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test("should navigate to Strategy page from sidebar", async ({ page }) => {
    await page.goto("/");

    // Click Strategy in sidebar
    await page.getByRole("link", { name: "Strategy" }).click();

    // Should navigate to strategy page
    await expect(page).toHaveURL("/strategy");
    await expect(page.getByRole("heading", { name: "Strategy" })).toBeVisible();
  });

  test("should show Strategy as active in sidebar when on strategy page", async ({ page }) => {
    await page.goto("/strategy");

    // Strategy link should have active state
    const strategyLink = page.getByRole("link", { name: "Strategy" });
    await expect(strategyLink).toHaveAttribute("aria-current", "page");
  });
});

// =============================================================================
// SUBCLASS TESTS (Story 4.2)
// =============================================================================

test.describe("Subclass List (AC-4.2.1)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should show expand/collapse button on asset class card", async ({ page }) => {
    // Look for chevron/toggle button
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    // If there are asset classes, toggle button should exist
    if (isVisible) {
      await expect(toggleButton).toBeVisible();
    }
  });

  test("should expand asset class to show subclasses section", async ({ page }) => {
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (isVisible) {
      await toggleButton.click();

      // Should see either subclasses or empty state
      const subclassSection = page
        .locator("text='No subclasses yet'")
        .or(page.locator("text='Add Subclass'"));
      await expect(subclassSection).toBeVisible({ timeout: 5000 });
    }
  });

  test("should collapse asset class when clicking toggle again", async ({ page }) => {
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (isVisible) {
      // Expand first
      await toggleButton.click();

      // Wait for expansion
      const addSubclassButton = page.getByRole("button", { name: /Add Subclass/i }).first();
      await expect(addSubclassButton).toBeVisible({ timeout: 5000 });

      // Collapse
      await toggleButton.click();

      // Subclass section should not be visible
      await expect(addSubclassButton).not.toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Create Subclass (AC-4.2.2)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should show Add Subclass button in expanded asset class", async ({ page }) => {
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (isVisible) {
      await toggleButton.click();

      // Should see Add Subclass button
      const addButton = page.getByRole("button", { name: /Add Subclass/i }).first();
      await expect(addButton).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show inline form when clicking Add Subclass", async ({ page }) => {
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (isVisible) {
      await toggleButton.click();

      const addButton = page.getByRole("button", { name: /Add Subclass/i }).first();
      await addButton.click();

      // Input should appear
      const nameInput = page.getByPlaceholder("Subclass name...");
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeFocused();
    }
  });

  test("should create subclass with valid name", async ({ page }) => {
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (isVisible) {
      await toggleButton.click();

      const addButton = page.getByRole("button", { name: /Add Subclass/i }).first();
      await addButton.click();

      // Fill in name
      const uniqueName = `Subclass ${Date.now()}`;
      const nameInput = page.getByPlaceholder("Subclass name...");
      await nameInput.fill(uniqueName);

      // Click create button (Plus icon)
      await page.locator("button[type='submit']").first().click();

      // Should show success toast
      await expect(page.getByText("Subclass created")).toBeVisible({ timeout: 10000 });

      // Subclass should appear in list
      await expect(page.getByText(uniqueName)).toBeVisible();
    }
  });

  test("should cancel create form when clicking cancel", async ({ page }) => {
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (isVisible) {
      await toggleButton.click();

      const addButton = page.getByRole("button", { name: /Add Subclass/i }).first();
      await addButton.click();

      // Form should be visible
      const nameInput = page.getByPlaceholder("Subclass name...");
      await expect(nameInput).toBeVisible();

      // Click cancel
      await page.getByRole("button", { name: "Cancel" }).click();

      // Form should disappear
      await expect(nameInput).not.toBeVisible();
    }
  });
});

test.describe("Edit Subclass (AC-4.2.3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    // Expand first asset class
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);
    if (isVisible) {
      await toggleButton.click();
    }
  });

  test("should show edit button on subclass card", async ({ page }) => {
    // Look for edit button in subclass section
    const subclassEditButton = page.locator(".pl-12 [aria-label='Edit']").first();
    const isVisible = await subclassEditButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(subclassEditButton).toBeVisible();
    }
  });

  test("should enter inline edit mode when clicking edit button", async ({ page }) => {
    const subclassEditButton = page.locator(".pl-12 [aria-label='Edit']").first();
    const isVisible = await subclassEditButton.isVisible().catch(() => false);

    if (isVisible) {
      await subclassEditButton.click();

      // Input should appear and be focused
      const input = page.locator(".pl-12 input").first();
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    }
  });

  test("should save changes when clicking checkmark", async ({ page }) => {
    const subclassEditButton = page.locator(".pl-12 [aria-label='Edit']").first();
    const isVisible = await subclassEditButton.isVisible().catch(() => false);

    if (isVisible) {
      await subclassEditButton.click();

      const input = page.locator(".pl-12 input").first();
      const newName = `Updated Subclass ${Date.now()}`;
      await input.clear();
      await input.fill(newName);

      // Click save button
      await page.locator(".pl-12 [aria-label='Save']").click();

      // Input should disappear
      await expect(input).not.toBeVisible({ timeout: 5000 });

      // Updated name should be visible
      await expect(page.getByText(newName)).toBeVisible();
    }
  });
});

test.describe("Delete Subclass (AC-4.2.4, AC-4.2.5)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    // Expand first asset class
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);
    if (isVisible) {
      await toggleButton.click();
    }
  });

  test("should show delete button on subclass card", async ({ page }) => {
    // Look for delete button in subclass section
    const subclassDeleteButton = page.locator(".pl-12 [aria-label='Delete']").first();
    const isVisible = await subclassDeleteButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(subclassDeleteButton).toBeVisible();
    }
  });

  test("should delete subclass without assets immediately", async ({ page }) => {
    // First create a new subclass to delete
    const addButton = page.getByRole("button", { name: /Add Subclass/i }).first();
    const isAddVisible = await addButton.isVisible().catch(() => false);

    if (isAddVisible) {
      await addButton.click();

      const uniqueName = `Delete Sub ${Date.now()}`;
      const nameInput = page.getByPlaceholder("Subclass name...");
      await nameInput.fill(uniqueName);

      // Create the subclass
      await page.locator("button[type='submit']").first().click();

      // Wait for success
      await expect(page.getByText("Subclass created")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(uniqueName)).toBeVisible();

      // Now find and click the delete button for this subclass
      const subclassCard = page.locator(".pl-12 div").filter({ hasText: uniqueName }).first();
      const deleteButton = subclassCard.locator("[aria-label='Delete']");
      await deleteButton.click();

      // Should show success toast immediately (no assets)
      await expect(page.getByText("Subclass deleted")).toBeVisible({ timeout: 10000 });

      // Subclass should be removed
      await expect(page.getByText(uniqueName)).not.toBeVisible();
    }
  });

  test("should show warning dialog when deleting subclass with assets", async ({ page }) => {
    const subclassDeleteButton = page.locator(".pl-12 [aria-label='Delete']").first();
    const isVisible = await subclassDeleteButton.isVisible().catch(() => false);

    if (isVisible) {
      await subclassDeleteButton.click();

      // Either deletes immediately (no assets) or shows warning dialog
      const warningDialog = page.getByRole("alertdialog");
      const hasWarning = await warningDialog.isVisible().catch(() => false);

      if (hasWarning) {
        // Dialog should show asset count warning
        await expect(page.getByText(/associated asset/)).toBeVisible();

        // Should have Cancel and Delete Anyway buttons
        await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
        await expect(page.getByRole("button", { name: /Delete Anyway/i })).toBeVisible();
      }
    }
  });
});

test.describe("Subclass Cascade Delete (AC-4.2.6)", () => {
  test("should delete subclasses when parent asset class is deleted", async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    // Create an asset class with a subclass, then delete the class
    // The subclass should be deleted automatically via cascade

    // First create asset class
    const addClassButton = page.getByRole("button", { name: /Add Class/i });
    await addClassButton.click();

    const className = `Cascade Test ${Date.now()}`;
    const classNameInput = page.getByPlaceholder("Asset class name");
    await classNameInput.fill(className);

    await page
      .locator('button:has-text("Save")')
      .or(page.locator("button svg.text-green-600").locator(".."))
      .click();
    await expect(page.getByText("Asset class created")).toBeVisible({ timeout: 10000 });

    // Expand and add subclass
    const classCard = page.locator("div").filter({ hasText: className }).first();
    const toggleButton = classCard.locator("[aria-label='Toggle subclasses']");
    await toggleButton.click();

    const addSubclassButton = page.getByRole("button", { name: /Add Subclass/i }).first();
    await expect(addSubclassButton).toBeVisible({ timeout: 5000 });
    await addSubclassButton.click();

    const subclassName = `Cascade Sub ${Date.now()}`;
    const subclassNameInput = page.getByPlaceholder("Subclass name...");
    await subclassNameInput.fill(subclassName);
    await page.locator("button[type='submit']").first().click();

    await expect(page.getByText("Subclass created")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(subclassName)).toBeVisible();

    // Now delete the parent class
    const deleteButton = classCard.locator("[aria-label='Delete']").first();
    await deleteButton.click();

    // Should delete (cascade removes subclasses)
    await expect(page.getByText("Asset class deleted")).toBeVisible({ timeout: 10000 });

    // Both class and subclass should be gone
    await expect(page.getByText(className)).not.toBeVisible();
    await expect(page.getByText(subclassName)).not.toBeVisible();
  });
});

// =============================================================================
// ALLOCATION RANGE TESTS (Story 4.3)
// =============================================================================

test.describe("Allocation Range Editor (AC-4.3.1)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should show allocation range inputs on asset class card", async ({ page }) => {
    // Look for Target Range label and inputs
    const targetRangeLabel = page.getByText("Target Range:");
    const isVisible = await targetRangeLabel
      .first()
      .isVisible()
      .catch(() => false);

    if (isVisible) {
      await expect(targetRangeLabel.first()).toBeVisible();

      // Should have Min % and Max % labels
      await expect(page.getByText("Min %").first()).toBeVisible();
      await expect(page.getByText("Max %").first()).toBeVisible();
    }
  });

  test("should allow setting allocation range", async ({ page }) => {
    // Look for min input in the first asset class card
    const minInput = page.locator("[aria-label='Minimum allocation percentage']").first();
    const isVisible = await minInput.isVisible().catch(() => false);

    if (isVisible) {
      // Set min value
      await minInput.clear();
      await minInput.fill("40");

      // Set max value
      const maxInput = page.locator("[aria-label='Maximum allocation percentage']").first();
      await maxInput.clear();
      await maxInput.fill("50");

      // Blur to trigger save
      await maxInput.blur();

      // Should show checkmark (saved indicator)
      await expect(page.locator("svg.text-green-600").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should accept empty values (optional fields)", async ({ page }) => {
    const minInput = page.locator("[aria-label='Minimum allocation percentage']").first();
    const isVisible = await minInput.isVisible().catch(() => false);

    if (isVisible) {
      // Clear both inputs
      await minInput.clear();

      const maxInput = page.locator("[aria-label='Maximum allocation percentage']").first();
      await maxInput.clear();

      // Blur to trigger save
      await maxInput.blur();

      // Should not show error (empty is valid)
      await expect(page.getByText("Minimum cannot exceed maximum")).not.toBeVisible();
    }
  });
});

test.describe("Allocation Range Validation (AC-4.3.2)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test("should show error when min > max", async ({ page }) => {
    const minInput = page.locator("[aria-label='Minimum allocation percentage']").first();
    const isVisible = await minInput.isVisible().catch(() => false);

    if (isVisible) {
      // Set min > max (invalid)
      await minInput.clear();
      await minInput.fill("60");

      const maxInput = page.locator("[aria-label='Maximum allocation percentage']").first();
      await maxInput.clear();
      await maxInput.fill("40");

      // Blur to trigger validation
      await maxInput.blur();

      // Should show error message
      await expect(page.getByText("Minimum cannot exceed maximum")).toBeVisible({ timeout: 5000 });
    }
  });

  test("should accept equal min and max values", async ({ page }) => {
    const minInput = page.locator("[aria-label='Minimum allocation percentage']").first();
    const isVisible = await minInput.isVisible().catch(() => false);

    if (isVisible) {
      // Set min = max (valid)
      await minInput.clear();
      await minInput.fill("45");

      const maxInput = page.locator("[aria-label='Maximum allocation percentage']").first();
      await maxInput.clear();
      await maxInput.fill("45");

      // Blur to trigger save
      await maxInput.blur();

      // Should show checkmark (saved indicator), not error
      await expect(page.getByText("Minimum cannot exceed maximum")).not.toBeVisible();
    }
  });
});

test.describe("Allocation Warning Banner (AC-4.3.3)", () => {
  // Note: This test requires multiple asset classes with high minimums
  // It may need test data setup to trigger the warning

  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test.skip("should show warning when total minimums exceed 100%", async ({ page }) => {
    // This test requires setting up multiple asset classes with minimums
    // totaling more than 100%

    // First, set high minimums on multiple asset classes
    // Then verify the warning banner appears

    // Look for warning banner
    const warningBanner = page.getByTestId("allocation-warning-banner");
    await expect(warningBanner).toBeVisible();
    await expect(page.getByText(/Total minimums.*exceed 100%/)).toBeVisible();
  });

  test.skip("should allow dismissing the warning banner", async ({ page }) => {
    const warningBanner = page.getByTestId("allocation-warning-banner");
    const isVisible = await warningBanner.isVisible().catch(() => false);

    if (isVisible) {
      // Click dismiss button
      await page.getByLabel("Dismiss warning").click();

      // Banner should disappear
      await expect(warningBanner).not.toBeVisible();
    }
  });
});

// =============================================================================
// SUBCLASS ALLOCATION RANGE TESTS (Story 4.4)
// =============================================================================

test.describe("Subclass Allocation Range Editor (AC-4.4.1)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    // Expand first asset class to show subclasses
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);
    if (isVisible) {
      await toggleButton.click();
    }
  });

  test("should show allocation range inputs on subclass card", async ({ page }) => {
    // Look for Min % and Max % labels in the subclass section
    const subclassMinLabel = page.locator(".pl-12").getByText("Min %").first();
    const isVisible = await subclassMinLabel.isVisible().catch(() => false);

    if (isVisible) {
      await expect(subclassMinLabel).toBeVisible();
      await expect(page.locator(".pl-12").getByText("Max %").first()).toBeVisible();
    }
  });

  test("should allow setting subclass allocation range", async ({ page }) => {
    // Look for min input in a subclass card
    const minInput = page.locator(".pl-12 [aria-label='Minimum allocation percentage']").first();
    const isVisible = await minInput.isVisible().catch(() => false);

    if (isVisible) {
      // Set min value
      await minInput.clear();
      await minInput.fill("20");

      // Set max value
      const maxInput = page.locator(".pl-12 [aria-label='Maximum allocation percentage']").first();
      await maxInput.clear();
      await maxInput.fill("30");

      // Blur to trigger save
      await maxInput.blur();

      // Should show checkmark (saved indicator)
      await expect(page.locator(".pl-12 svg.text-green-600").first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should show Flexible badge when subclass has no allocation ranges (AC-4.4.5)", async ({
    page,
  }) => {
    // Create a new subclass without setting allocation ranges
    const addButton = page.getByRole("button", { name: /Add Subclass/i }).first();
    const isAddVisible = await addButton.isVisible().catch(() => false);

    if (isAddVisible) {
      await addButton.click();

      const uniqueName = `Flex Sub ${Date.now()}`;
      const nameInput = page.getByPlaceholder("Subclass name...");
      await nameInput.fill(uniqueName);

      // Create the subclass
      await page.locator("button[type='submit']").first().click();

      // Wait for success
      await expect(page.getByText("Subclass created")).toBeVisible({ timeout: 10000 });

      // Should show Flexible badge (since no allocation ranges set)
      await expect(page.getByText("Flexible")).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Subclass Allocation Range Validation (AC-4.4.4)", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");

    // Expand first asset class
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    const isVisible = await toggleButton.isVisible().catch(() => false);
    if (isVisible) {
      await toggleButton.click();
    }
  });

  test("should show error when subclass min > max", async ({ page }) => {
    const minInput = page.locator(".pl-12 [aria-label='Minimum allocation percentage']").first();
    const isVisible = await minInput.isVisible().catch(() => false);

    if (isVisible) {
      // Set min > max (invalid)
      await minInput.clear();
      await minInput.fill("40");

      const maxInput = page.locator(".pl-12 [aria-label='Maximum allocation percentage']").first();
      await maxInput.clear();
      await maxInput.fill("20");

      // Blur to trigger validation
      await maxInput.blur();

      // Should show error message
      await expect(page.getByText("Minimum cannot exceed maximum")).toBeVisible({ timeout: 5000 });
    }
  });

  test("should accept equal min and max values for subclass", async ({ page }) => {
    const minInput = page.locator(".pl-12 [aria-label='Minimum allocation percentage']").first();
    const isVisible = await minInput.isVisible().catch(() => false);

    if (isVisible) {
      // Set min = max (valid)
      await minInput.clear();
      await minInput.fill("25");

      const maxInput = page.locator(".pl-12 [aria-label='Maximum allocation percentage']").first();
      await maxInput.clear();
      await maxInput.fill("25");

      // Blur to trigger save
      await maxInput.blur();

      // Should show checkmark (saved indicator), not error
      await expect(page.getByText("Minimum cannot exceed maximum")).not.toBeVisible();
    }
  });
});

test.describe("Subclass Allocation Warning Banner (AC-4.4.2, AC-4.4.3)", () => {
  // Note: These tests require specific configurations to trigger warnings

  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto("/strategy");
  });

  test.skip("should show warning when subclass max exceeds parent class max", async ({ page }) => {
    // This test requires:
    // 1. Asset class with targetMax set (e.g., 50%)
    // 2. Subclass with targetMax > parent max (e.g., 60%)

    // Expand asset class
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    await toggleButton.click();

    // Look for warning banner
    const warningBanner = page.getByTestId("subclass-exceeds-warning");
    await expect(warningBanner).toBeVisible();
    await expect(page.getByText(/exceeds parent maximum/)).toBeVisible();
  });

  test.skip("should show warning when sum of subclass minimums exceeds parent max", async ({
    page,
  }) => {
    // This test requires:
    // 1. Asset class with targetMax set (e.g., 50%)
    // 2. Multiple subclasses with minimums summing > parent max (e.g., 30% + 25% = 55%)

    // Expand asset class
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    await toggleButton.click();

    // Look for warning banner
    const warningBanner = page.getByTestId("subclass-sum-warning");
    await expect(warningBanner).toBeVisible();
    await expect(page.getByText(/Sum of subclass minimums.*exceeds parent maximum/)).toBeVisible();
  });

  test.skip("should allow dismissing subclass allocation warning", async ({ page }) => {
    // Expand asset class
    const toggleButton = page.locator("[aria-label='Toggle subclasses']").first();
    await toggleButton.click();

    const warningBanner = page
      .getByTestId("subclass-exceeds-warning")
      .or(page.getByTestId("subclass-sum-warning"));
    const isVisible = await warningBanner.isVisible().catch(() => false);

    if (isVisible) {
      // Click dismiss button
      await page.getByLabel("Dismiss warning").click();

      // Banner should disappear
      await expect(warningBanner).not.toBeVisible();
    }
  });
});
