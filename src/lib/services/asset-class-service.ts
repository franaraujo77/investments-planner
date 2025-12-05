/**
 * Asset Class and Subclass Service
 *
 * Business logic for asset class and subclass operations.
 * Story 4.1: Define Asset Classes
 * Story 4.2: Define Subclasses
 * Story 4.3: Set Allocation Ranges for Classes
 * Story 4.5: Set Asset Count Limits
 *
 * AC-4.1.1: View list of asset classes
 * AC-4.1.2: Create asset class with name and optional icon
 * AC-4.1.3: Edit asset class name
 * AC-4.1.4: Delete asset class (no assets)
 * AC-4.1.5: Delete asset class with warning (has assets)
 *
 * AC-4.2.1: View subclasses within asset class
 * AC-4.2.2: Create subclass
 * AC-4.2.3: Edit subclass name
 * AC-4.2.4: Delete subclass (no assets)
 * AC-4.2.5: Delete subclass with warning (has assets)
 * AC-4.2.6: Cascade delete with parent class
 *
 * AC-4.3.1: View and set allocation ranges (targetMin, targetMax)
 * AC-4.3.2: Validation - min cannot exceed max
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * AC-4.5.1: Set max assets limit
 * AC-4.5.2: Display warning when asset count exceeds limit
 * AC-4.5.3: No limit when max assets is not set
 * AC-4.5.4: Asset count display for classes
 * AC-4.5.5: Asset count display for subclasses
 *
 * Multi-tenant isolation: All operations scoped by userId
 */

import { db } from "@/lib/db";
import {
  assetClasses,
  assetSubclasses,
  portfolioAssets,
  portfolios,
  type AssetClass,
  type AssetSubclass,
  type NewAssetClass,
  type NewAssetSubclass,
} from "@/lib/db/schema";
import { eq, count, and } from "drizzle-orm";
import Decimal from "decimal.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum number of asset classes per user
 * Per tech-spec-epic-4.md constraint
 */
export const MAX_ASSET_CLASSES_PER_USER = 10;

/**
 * Maximum number of subclasses per asset class
 * Per tech-spec-epic-4.md constraint (mirrors asset class limit)
 */
export const MAX_SUBCLASSES_PER_CLASS = 10;

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

/**
 * Error thrown when user has reached the maximum number of asset classes
 */
export class AssetClassLimitError extends Error {
  constructor() {
    super(`Maximum of ${MAX_ASSET_CLASSES_PER_USER} asset classes allowed`);
    this.name = "AssetClassLimitError";
  }
}

/**
 * Error thrown when asset class is not found
 */
export class AssetClassNotFoundError extends Error {
  constructor() {
    super("Asset class not found");
    this.name = "AssetClassNotFoundError";
  }
}

/**
 * Error thrown when user has reached the maximum number of subclasses per class
 */
export class SubclassLimitError extends Error {
  constructor() {
    super(`Maximum of ${MAX_SUBCLASSES_PER_CLASS} subclasses per class allowed`);
    this.name = "SubclassLimitError";
  }
}

/**
 * Error thrown when subclass is not found
 */
export class SubclassNotFoundError extends Error {
  constructor() {
    super("Subclass not found");
    this.name = "SubclassNotFoundError";
  }
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateAssetClassInput {
  name: string;
  icon?: string | null | undefined;
}

export interface UpdateAssetClassInput {
  name?: string | undefined;
  icon?: string | null | undefined;
  targetMin?: string | null | undefined;
  targetMax?: string | null | undefined;
  maxAssets?: number | null | undefined; // Story 4.5: null or 0 = no limit
  minAllocationValue?: string | null | undefined; // Story 4.6: null or "0" = no minimum
}

export interface CreateSubclassInput {
  name: string;
}

export interface UpdateSubclassInput {
  name?: string | undefined;
  targetMin?: string | null | undefined;
  targetMax?: string | null | undefined;
  maxAssets?: number | null | undefined; // Story 4.5: null or 0 = no limit
  minAllocationValue?: string | null | undefined; // Story 4.6: null or "0" = no minimum
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Get count of asset classes for a user
 *
 * @param userId - User ID to count asset classes for
 * @returns Number of asset classes the user has
 */
export async function getAssetClassCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId));

  return result[0]?.count ?? 0;
}

/**
 * Get all asset classes for a user
 *
 * Multi-tenant isolation: Only returns classes belonging to the userId
 *
 * @param userId - User ID to fetch asset classes for
 * @returns Array of user's asset classes ordered by sortOrder (ascending)
 */
export async function getClassesForUser(userId: string): Promise<AssetClass[]> {
  return db.query.assetClasses.findMany({
    where: eq(assetClasses.userId, userId),
    orderBy: (assetClasses, { asc }) => [asc(assetClasses.sortOrder)],
  });
}

/**
 * Get a single asset class by ID
 *
 * Multi-tenant isolation: Only returns if class belongs to the userId
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to fetch
 * @returns Asset class or null if not found/not owned by user
 */
export async function getAssetClassById(
  userId: string,
  classId: string
): Promise<AssetClass | null> {
  const result = await db.query.assetClasses.findFirst({
    where: (assetClasses, { and, eq }) =>
      and(eq(assetClasses.id, classId), eq(assetClasses.userId, userId)),
  });

  return result ?? null;
}

/**
 * Create a new asset class
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.2: Create with name (1-50 chars) and optional icon
 *
 * @param userId - User ID creating the asset class
 * @param input - Asset class creation input (name, icon)
 * @returns Created asset class
 * @throws AssetClassLimitError if user already has 10 asset classes
 */
export async function createClass(
  userId: string,
  input: CreateAssetClassInput
): Promise<AssetClass> {
  // Check asset class limit before creating
  const currentCount = await getAssetClassCount(userId);

  if (currentCount >= MAX_ASSET_CLASSES_PER_USER) {
    throw new AssetClassLimitError();
  }

  // Get the next sort order (max + 1)
  const existingClasses = await getClassesForUser(userId);
  const maxSortOrder = existingClasses.reduce((max, c) => {
    const order = parseInt(c.sortOrder ?? "0", 10);
    return order > max ? order : max;
  }, -1);

  const newAssetClass: NewAssetClass = {
    userId,
    name: input.name,
    icon: input.icon ?? null,
    sortOrder: String(maxSortOrder + 1),
  };

  const result = await db.insert(assetClasses).values(newAssetClass).returning();

  if (!result[0]) {
    throw new Error("Failed to create asset class");
  }

  return result[0];
}

/**
 * Update an asset class
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.3: Edit asset class name
 *
 * Multi-tenant isolation: Verifies class ownership before updating
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to update
 * @param input - Partial update input (name and/or icon)
 * @returns Updated asset class
 * @throws AssetClassNotFoundError if class doesn't exist or user doesn't own it
 */
export async function updateClass(
  userId: string,
  classId: string,
  input: UpdateAssetClassInput
): Promise<AssetClass> {
  // Verify ownership
  const existingClass = await getAssetClassById(userId, classId);

  if (!existingClass) {
    throw new AssetClassNotFoundError();
  }

  // Build update object with only provided fields
  const updateData: Partial<NewAssetClass> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.icon !== undefined) {
    updateData.icon = input.icon;
  }

  // Story 4.3: Allocation range fields
  if (input.targetMin !== undefined) {
    updateData.targetMin = input.targetMin;
  }

  if (input.targetMax !== undefined) {
    updateData.targetMax = input.targetMax;
  }

  // Story 4.5: Max assets limit
  if (input.maxAssets !== undefined) {
    // Convert number to string for database (numeric type)
    updateData.maxAssets = input.maxAssets === null ? null : String(input.maxAssets);
  }

  // Story 4.6: Min allocation value
  if (input.minAllocationValue !== undefined) {
    // Store as string (numeric type), null or "0" = no minimum
    updateData.minAllocationValue = input.minAllocationValue;
  }

  const result = await db
    .update(assetClasses)
    .set(updateData)
    .where(eq(assetClasses.id, classId))
    .returning();

  if (!result[0]) {
    throw new Error("Failed to update asset class");
  }

  return result[0];
}

/**
 * Get the count of assets associated with an asset class
 *
 * AC-4.1.5: Check for associated assets before deletion
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to check
 * @returns Number of assets in this class
 */
export async function getAssetCountByClass(userId: string, classId: string): Promise<number> {
  // First verify the class belongs to the user
  const assetClass = await getAssetClassById(userId, classId);

  if (!assetClass) {
    return 0;
  }

  // Count assets with this class ID
  // We need to join through portfolios to ensure multi-tenant isolation
  const result = await db
    .select({ count: count() })
    .from(portfolioAssets)
    .where(eq(portfolioAssets.assetClassId, classId));

  return result[0]?.count ?? 0;
}

/**
 * Delete an asset class
 *
 * Story 4.1: Define Asset Classes
 * AC-4.1.4: Delete asset class (when no assets)
 * AC-4.1.5: Delete with warning (when has assets - handled by API layer)
 *
 * Multi-tenant isolation: Verifies class ownership before deleting
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to delete
 * @throws AssetClassNotFoundError if class doesn't exist or user doesn't own it
 */
export async function deleteClass(userId: string, classId: string): Promise<void> {
  // Verify ownership
  const existingClass = await getAssetClassById(userId, classId);

  if (!existingClass) {
    throw new AssetClassNotFoundError();
  }

  // Delete the class (cascades to subclasses)
  await db.delete(assetClasses).where(eq(assetClasses.id, classId));
}

/**
 * Check if user can create more asset classes
 *
 * @param userId - User ID to check
 * @returns true if user can create more asset classes
 */
export async function canCreateAssetClass(userId: string): Promise<boolean> {
  const currentCount = await getAssetClassCount(userId);
  return currentCount < MAX_ASSET_CLASSES_PER_USER;
}

// =============================================================================
// SUBCLASS SERVICE FUNCTIONS (Story 4.2)
// =============================================================================

/**
 * Get count of subclasses for an asset class
 *
 * @param classId - Asset class ID to count subclasses for
 * @returns Number of subclasses in this class
 */
export async function getSubclassCount(classId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(assetSubclasses)
    .where(eq(assetSubclasses.classId, classId));

  return result[0]?.count ?? 0;
}

/**
 * Get all subclasses for an asset class
 *
 * Multi-tenant isolation: Verifies parent class ownership via userId
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to fetch subclasses for
 * @returns Array of subclasses ordered by sortOrder (ascending)
 * @throws AssetClassNotFoundError if class doesn't exist or user doesn't own it
 */
export async function getSubclassesForClass(
  userId: string,
  classId: string
): Promise<AssetSubclass[]> {
  // Verify class ownership first
  const assetClass = await getAssetClassById(userId, classId);

  if (!assetClass) {
    throw new AssetClassNotFoundError();
  }

  return db.query.assetSubclasses.findMany({
    where: eq(assetSubclasses.classId, classId),
    orderBy: (assetSubclasses, { asc }) => [asc(assetSubclasses.sortOrder)],
  });
}

/**
 * Get a single subclass by ID with ownership verification
 *
 * Multi-tenant isolation: Verifies parent class ownership via userId
 *
 * @param userId - User ID (for ownership verification)
 * @param subclassId - Subclass ID to fetch
 * @returns Subclass or null if not found/not owned by user
 */
export async function getSubclassById(
  userId: string,
  subclassId: string
): Promise<AssetSubclass | null> {
  // Get subclass with its parent class
  const result = await db.query.assetSubclasses.findFirst({
    where: eq(assetSubclasses.id, subclassId),
    with: { assetClass: true },
  });

  if (!result) {
    return null;
  }

  // Verify parent class belongs to user (multi-tenant isolation)
  if (result.assetClass.userId !== userId) {
    return null;
  }

  return result;
}

/**
 * Create a new subclass within an asset class
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.2: Create subclass with name (1-50 chars)
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to add subclass to
 * @param input - Subclass creation input (name)
 * @returns Created subclass
 * @throws AssetClassNotFoundError if class doesn't exist or user doesn't own it
 * @throws SubclassLimitError if class already has 10 subclasses
 */
export async function createSubclass(
  userId: string,
  classId: string,
  input: CreateSubclassInput
): Promise<AssetSubclass> {
  // Verify class ownership first
  const assetClass = await getAssetClassById(userId, classId);

  if (!assetClass) {
    throw new AssetClassNotFoundError();
  }

  // Check subclass limit
  const currentCount = await getSubclassCount(classId);

  if (currentCount >= MAX_SUBCLASSES_PER_CLASS) {
    throw new SubclassLimitError();
  }

  // Get the next sort order (max + 1)
  const existingSubclasses = await db.query.assetSubclasses.findMany({
    where: eq(assetSubclasses.classId, classId),
  });
  const maxSortOrder = existingSubclasses.reduce((max, s) => {
    const order = parseInt(s.sortOrder ?? "0", 10);
    return order > max ? order : max;
  }, -1);

  const newSubclass: NewAssetSubclass = {
    classId,
    name: input.name,
    sortOrder: String(maxSortOrder + 1),
  };

  const result = await db.insert(assetSubclasses).values(newSubclass).returning();

  if (!result[0]) {
    throw new Error("Failed to create subclass");
  }

  return result[0];
}

/**
 * Update a subclass
 *
 * Story 4.2: Define Subclasses
 * Story 4.4: Set Allocation Ranges for Subclasses
 * AC-4.2.3: Edit subclass name
 * AC-4.4.1: Set allocation ranges (targetMin, targetMax)
 *
 * Multi-tenant isolation: Verifies parent class ownership before updating
 *
 * @param userId - User ID (for ownership verification)
 * @param subclassId - Subclass ID to update
 * @param input - Partial update input (name, targetMin, targetMax)
 * @returns Updated subclass
 * @throws SubclassNotFoundError if subclass doesn't exist or user doesn't own it
 */
export async function updateSubclass(
  userId: string,
  subclassId: string,
  input: UpdateSubclassInput
): Promise<AssetSubclass> {
  // Verify ownership via parent class
  const existingSubclass = await getSubclassById(userId, subclassId);

  if (!existingSubclass) {
    throw new SubclassNotFoundError();
  }

  // Build update object with only provided fields
  const updateData: Partial<NewAssetSubclass> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  // Story 4.4: Allocation range fields
  if (input.targetMin !== undefined) {
    updateData.targetMin = input.targetMin;
  }

  if (input.targetMax !== undefined) {
    updateData.targetMax = input.targetMax;
  }

  // Story 4.5: Max assets limit
  if (input.maxAssets !== undefined) {
    // Convert number to string for database (numeric type)
    updateData.maxAssets = input.maxAssets === null ? null : String(input.maxAssets);
  }

  // Story 4.6: Min allocation value
  if (input.minAllocationValue !== undefined) {
    // Store as string (numeric type), null or "0" = no minimum
    updateData.minAllocationValue = input.minAllocationValue;
  }

  const result = await db
    .update(assetSubclasses)
    .set(updateData)
    .where(eq(assetSubclasses.id, subclassId))
    .returning();

  if (!result[0]) {
    throw new Error("Failed to update subclass");
  }

  return result[0];
}

/**
 * Get the count of assets associated with a subclass
 *
 * AC-4.2.5: Check for associated assets before deletion
 *
 * @param userId - User ID (for ownership verification)
 * @param subclassId - Subclass ID to check
 * @returns Number of assets in this subclass
 */
export async function getAssetCountBySubclass(userId: string, subclassId: string): Promise<number> {
  // First verify the subclass belongs to the user
  const subclass = await getSubclassById(userId, subclassId);

  if (!subclass) {
    return 0;
  }

  // Count assets with this subclass ID
  const result = await db
    .select({ count: count() })
    .from(portfolioAssets)
    .where(eq(portfolioAssets.subclassId, subclassId));

  return result[0]?.count ?? 0;
}

/**
 * Delete a subclass
 *
 * Story 4.2: Define Subclasses
 * AC-4.2.4: Delete subclass (when no assets)
 * AC-4.2.5: Delete with warning (when has assets - handled by API layer)
 *
 * Multi-tenant isolation: Verifies parent class ownership before deleting
 *
 * @param userId - User ID (for ownership verification)
 * @param subclassId - Subclass ID to delete
 * @throws SubclassNotFoundError if subclass doesn't exist or user doesn't own it
 */
export async function deleteSubclass(userId: string, subclassId: string): Promise<void> {
  // Verify ownership via parent class
  const existingSubclass = await getSubclassById(userId, subclassId);

  if (!existingSubclass) {
    throw new SubclassNotFoundError();
  }

  // Delete the subclass
  await db.delete(assetSubclasses).where(eq(assetSubclasses.id, subclassId));
}

/**
 * Check if user can create more subclasses in a class
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to check
 * @returns true if user can create more subclasses
 * @throws AssetClassNotFoundError if class doesn't exist or user doesn't own it
 */
export async function canCreateSubclass(userId: string, classId: string): Promise<boolean> {
  // Verify class ownership first
  const assetClass = await getAssetClassById(userId, classId);

  if (!assetClass) {
    throw new AssetClassNotFoundError();
  }

  const currentCount = await getSubclassCount(classId);
  return currentCount < MAX_SUBCLASSES_PER_CLASS;
}

// =============================================================================
// ALLOCATION SERVICE FUNCTIONS (Story 4.3)
// =============================================================================

/**
 * Warning type for allocation validation
 */
export interface AllocationWarning {
  type: "MINIMUM_SUM_EXCEEDS_100";
  message: string;
  totalMinimums: string;
  affectedClasses: string[];
}

/**
 * Result of allocation validation
 * AC-4.3.3: Warnings are non-blocking, configuration can still be saved
 */
export interface AllocationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: AllocationWarning[];
}

/**
 * Summary of allocation configuration
 */
export interface AllocationSummary {
  totalMinimums: string;
  totalMaximums: string;
  unallocatedMinimum: string;
  classCount: number;
  classesWithRanges: number;
}

/**
 * Validate all allocation ranges for a user
 *
 * Story 4.3: Set Allocation Ranges for Classes
 * AC-4.3.3: Warning when sum of minimums exceeds 100%
 *
 * Multi-tenant isolation: Only validates classes belonging to userId
 *
 * @param userId - User ID to validate allocation ranges for
 * @returns Validation result with errors and warnings
 */
export async function validateAllocationRanges(
  userId: string
): Promise<AllocationValidationResult> {
  const classes = await getClassesForUser(userId);

  const result: AllocationValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Calculate sum of minimums using decimal.js for precision
  let totalMinimums = new Decimal(0);
  const affectedClasses: string[] = [];

  for (const assetClass of classes) {
    if (assetClass.targetMin) {
      totalMinimums = totalMinimums.plus(new Decimal(assetClass.targetMin));
      affectedClasses.push(assetClass.id);
    }
  }

  // AC-4.3.3: Warning (not error) if sum of minimums > 100%
  if (totalMinimums.greaterThan(100)) {
    result.warnings.push({
      type: "MINIMUM_SUM_EXCEEDS_100",
      message: `Total minimums (${totalMinimums.toFixed(2)}%) exceed 100%. This configuration may be impossible to satisfy.`,
      totalMinimums: totalMinimums.toFixed(2),
      affectedClasses,
    });
  }

  return result;
}

/**
 * Get allocation summary for a user
 *
 * Story 4.3: Set Allocation Ranges for Classes
 *
 * Multi-tenant isolation: Only summarizes classes belonging to userId
 *
 * @param userId - User ID to get allocation summary for
 * @returns Summary of allocation configuration
 */
export async function getAllocationSummary(userId: string): Promise<AllocationSummary> {
  const classes = await getClassesForUser(userId);

  let totalMinimums = new Decimal(0);
  let totalMaximums = new Decimal(0);
  let classesWithRanges = 0;

  for (const assetClass of classes) {
    if (assetClass.targetMin) {
      totalMinimums = totalMinimums.plus(new Decimal(assetClass.targetMin));
      classesWithRanges++;
    }
    if (assetClass.targetMax) {
      totalMaximums = totalMaximums.plus(new Decimal(assetClass.targetMax));
    }
  }

  // Calculate unallocated minimum (100% - totalMinimums)
  const unallocatedMinimum = new Decimal(100).minus(totalMinimums);

  return {
    totalMinimums: totalMinimums.toFixed(2),
    totalMaximums: totalMaximums.toFixed(2),
    unallocatedMinimum: unallocatedMinimum.isNegative() ? "0.00" : unallocatedMinimum.toFixed(2),
    classCount: classes.length,
    classesWithRanges,
  };
}

// =============================================================================
// SUBCLASS ALLOCATION SERVICE FUNCTIONS (Story 4.4)
// =============================================================================

/**
 * Warning type for subclass allocation validation
 *
 * Story 4.4: Set Allocation Ranges for Subclasses
 * AC-4.4.2: Subclass max exceeds parent max warning
 * AC-4.4.3: Sum of subclass minimums exceeds parent max warning
 */
export interface SubclassAllocationWarning {
  type: "SUBCLASS_EXCEEDS_PARENT_MAX" | "SUBCLASS_SUM_EXCEEDS_PARENT_MAX";
  message: string;
  subclassId?: string;
  subclassName?: string;
  totalMinimums?: string;
  parentMax?: string;
}

/**
 * Result of subclass allocation validation
 *
 * AC-4.4.2, AC-4.4.3: Warnings are non-blocking, configuration can still be saved
 */
export interface SubclassAllocationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: SubclassAllocationWarning[];
}

/**
 * Validate all subclass allocation ranges against parent class constraints
 *
 * Story 4.4: Set Allocation Ranges for Subclasses
 * AC-4.4.2: Warning when subclass max exceeds parent class max
 * AC-4.4.3: Warning when sum of subclass minimums exceeds parent max
 *
 * Multi-tenant isolation: Verifies class ownership via userId
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to validate subclasses for
 * @returns Validation result with errors and warnings
 * @throws AssetClassNotFoundError if class doesn't exist or user doesn't own it
 */
export async function validateSubclassAllocationRanges(
  userId: string,
  classId: string
): Promise<SubclassAllocationValidationResult> {
  // Verify class ownership first
  const parentClass = await getAssetClassById(userId, classId);

  if (!parentClass) {
    throw new AssetClassNotFoundError();
  }

  const subclasses = await getSubclassesForClass(userId, classId);

  const result: SubclassAllocationValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // AC-4.4.2: Check each subclass max against parent max
  if (parentClass.targetMax) {
    const parentMaxDecimal = new Decimal(parentClass.targetMax);

    for (const subclass of subclasses) {
      if (subclass.targetMax) {
        const subclassMaxDecimal = new Decimal(subclass.targetMax);
        if (subclassMaxDecimal.greaterThan(parentMaxDecimal)) {
          result.warnings.push({
            type: "SUBCLASS_EXCEEDS_PARENT_MAX",
            message: `${subclass.name} max (${subclass.targetMax}%) exceeds parent maximum (${parentClass.targetMax}%)`,
            subclassId: subclass.id,
            subclassName: subclass.name,
            parentMax: parentClass.targetMax,
          });
        }
      }
    }
  }

  // AC-4.4.3: Check sum of subclass minimums against parent maximum
  if (parentClass.targetMax) {
    let totalSubclassMinimums = new Decimal(0);

    for (const subclass of subclasses) {
      if (subclass.targetMin) {
        totalSubclassMinimums = totalSubclassMinimums.plus(new Decimal(subclass.targetMin));
      }
    }

    const parentMaxDecimal = new Decimal(parentClass.targetMax);
    if (totalSubclassMinimums.greaterThan(parentMaxDecimal)) {
      result.warnings.push({
        type: "SUBCLASS_SUM_EXCEEDS_PARENT_MAX",
        message: `Sum of subclass minimums (${totalSubclassMinimums.toFixed(2)}%) exceeds parent maximum (${parentClass.targetMax}%)`,
        totalMinimums: totalSubclassMinimums.toFixed(2),
        parentMax: parentClass.targetMax,
      });
    }
  }

  return result;
}

// =============================================================================
// ASSET COUNT STATUS SERVICE FUNCTIONS (Story 4.5)
// =============================================================================

/**
 * Status of asset count for a subclass
 *
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.5: Asset count display for subclasses
 */
export interface SubclassAssetCountStatus {
  subclassId: string;
  subclassName: string;
  currentCount: number;
  maxAssets: number | null;
  isOverLimit: boolean;
}

/**
 * Status of asset count for a class, including subclasses
 *
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.4: Asset count display for classes
 */
export interface AssetCountStatus {
  classId: string;
  className: string;
  currentCount: number;
  maxAssets: number | null;
  isOverLimit: boolean;
  subclasses: SubclassAssetCountStatus[];
}

/**
 * Calculate asset count for an asset class
 *
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.4: The count reflects non-ignored assets only
 *
 * Multi-tenant isolation: Joins through portfolios to verify ownership
 *
 * @param userId - User ID (for ownership verification)
 * @param classId - Asset class ID to count assets for
 * @returns Number of non-ignored assets in this class
 */
export async function calculateAssetCountForClass(
  userId: string,
  classId: string
): Promise<number> {
  // Count non-ignored assets assigned to this class
  // Join through portfolios to ensure multi-tenant isolation
  const result = await db
    .select({ count: count() })
    .from(portfolioAssets)
    .innerJoin(portfolios, eq(portfolioAssets.portfolioId, portfolios.id))
    .where(
      and(
        eq(portfolioAssets.assetClassId, classId),
        eq(portfolioAssets.isIgnored, false),
        eq(portfolios.userId, userId)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Calculate asset count for a subclass
 *
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.5: Subclass count is independent of parent class count
 *
 * Multi-tenant isolation: Joins through portfolios to verify ownership
 *
 * @param userId - User ID (for ownership verification)
 * @param subclassId - Subclass ID to count assets for
 * @returns Number of non-ignored assets in this subclass
 */
export async function calculateAssetCountForSubclass(
  userId: string,
  subclassId: string
): Promise<number> {
  // Count non-ignored assets assigned to this subclass
  // Join through portfolios to ensure multi-tenant isolation
  const result = await db
    .select({ count: count() })
    .from(portfolioAssets)
    .innerJoin(portfolios, eq(portfolioAssets.portfolioId, portfolios.id))
    .where(
      and(
        eq(portfolioAssets.subclassId, subclassId),
        eq(portfolioAssets.isIgnored, false),
        eq(portfolios.userId, userId)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Check if asset count exceeds limit
 *
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.2: isOverLimit true when currentCount > maxAssets (and maxAssets > 0)
 * AC-4.5.3: No limit when max assets is null or 0
 *
 * @param currentCount - Current number of assets
 * @param maxAssets - Maximum allowed (null or 0 = no limit)
 * @returns true if over limit, false otherwise
 */
function isOverLimitCheck(currentCount: number, maxAssets: number | null): boolean {
  // null or 0 = no limit
  if (maxAssets === null || maxAssets === 0) {
    return false;
  }
  return currentCount > maxAssets;
}

/**
 * Get asset count status for all classes and subclasses
 *
 * Story 4.5: Set Asset Count Limits
 * AC-4.5.2: Display warning when asset count exceeds limit
 * AC-4.5.4: Asset count display for classes
 * AC-4.5.5: Asset count display for subclasses
 *
 * Multi-tenant isolation: Only returns status for classes belonging to userId
 *
 * Performance: Uses Promise.all for parallel query execution
 * - Class-level queries run in parallel
 * - Subclass-level queries within each class run in parallel
 * - Reduces from ~121 sequential queries to ~3 parallel batches (worst case)
 *
 * @param userId - User ID to get asset count status for
 * @returns Array of asset count status for all user's classes
 */
export async function getAssetCountStatus(userId: string): Promise<AssetCountStatus[]> {
  const classes = await getClassesForUser(userId);

  // Process all classes in parallel
  const statusList = await Promise.all(
    classes.map(async (assetClass) => {
      // Run class asset count and subclass fetch in parallel
      const [classAssetCount, subclassesList] = await Promise.all([
        calculateAssetCountForClass(userId, assetClass.id),
        db.query.assetSubclasses.findMany({
          where: eq(assetSubclasses.classId, assetClass.id),
          orderBy: (subclasses, { asc }) => [asc(subclasses.sortOrder)],
        }),
      ]);

      const classMaxAssets = assetClass.maxAssets ? parseInt(assetClass.maxAssets, 10) : null;

      // Process all subclasses in parallel
      const subclassStatusList = await Promise.all(
        subclassesList.map(async (subclass) => {
          const subclassAssetCount = await calculateAssetCountForSubclass(userId, subclass.id);
          const subclassMaxAssets = subclass.maxAssets ? parseInt(subclass.maxAssets, 10) : null;

          return {
            subclassId: subclass.id,
            subclassName: subclass.name,
            currentCount: subclassAssetCount,
            maxAssets: subclassMaxAssets,
            isOverLimit: isOverLimitCheck(subclassAssetCount, subclassMaxAssets),
          };
        })
      );

      return {
        classId: assetClass.id,
        className: assetClass.name,
        currentCount: classAssetCount,
        maxAssets: classMaxAssets,
        isOverLimit: isOverLimitCheck(classAssetCount, classMaxAssets),
        subclasses: subclassStatusList,
      };
    })
  );

  return statusList;
}
