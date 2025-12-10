/**
 * Criteria Service
 *
 * Business logic for scoring criteria operations.
 * Story 5.1: Define Scoring Criteria
 *
 * AC-5.1.1: Create new criterion
 * AC-5.1.2: Criterion form fields validation (handled by Zod schemas)
 * AC-5.1.3: Criteria organization by market/asset type
 * AC-5.1.4: CriteriaBlock component interactions (CRUD operations)
 * AC-5.1.5: Points validation (handled by Zod schemas)
 * AC-5.1.6: Criteria versioning (immutable)
 *
 * Multi-tenant isolation: All operations scoped by userId
 */

import { db } from "@/lib/db";
import {
  criteriaVersions,
  type CriteriaVersion,
  type NewCriteriaVersion,
  type CriterionRule,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  type CreateCriteriaSetInput,
  type UpdateCriteriaSetInput,
  type CreateCriterionRuleInput,
  type UpdateCriterionInput,
  type CopyCriteriaInput,
  MAX_CRITERIA_SETS_PER_USER,
} from "@/lib/validations/criteria-schemas";

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

/**
 * Error thrown when user has reached the maximum number of criteria sets
 */
export class CriteriaSetLimitError extends Error {
  constructor() {
    super(`Maximum of ${MAX_CRITERIA_SETS_PER_USER} criteria sets allowed`);
    this.name = "CriteriaSetLimitError";
  }
}

/**
 * Error thrown when criteria set is not found
 */
export class CriteriaNotFoundError extends Error {
  constructor() {
    super("Criteria set not found");
    this.name = "CriteriaNotFoundError";
  }
}

/**
 * Error thrown when criterion is not found within a set
 */
export class CriterionNotFoundError extends Error {
  constructor() {
    super("Criterion not found");
    this.name = "CriterionNotFoundError";
  }
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Generate a UUID for new criterion rules
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get count of criteria sets for a user
 *
 * @param userId - User ID to count criteria sets for
 * @returns Number of criteria sets the user has
 */
export async function getCriteriaSetCount(userId: string): Promise<number> {
  const result = await db
    .select()
    .from(criteriaVersions)
    .where(and(eq(criteriaVersions.userId, userId), eq(criteriaVersions.isActive, true)));

  return result.length;
}

/**
 * Get all criteria sets for a user
 *
 * Multi-tenant isolation: Only returns criteria belonging to the userId
 *
 * @param userId - User ID to fetch criteria sets for
 * @param options - Optional filters (assetType, targetMarket, isActive)
 * @returns Array of user's criteria sets ordered by updatedAt (descending)
 */
export async function getCriteriaSetsForUser(
  userId: string,
  options?: {
    assetType?: string;
    targetMarket?: string;
    isActive?: boolean;
  }
): Promise<CriteriaVersion[]> {
  // Build conditions array
  const conditions = [eq(criteriaVersions.userId, userId)];

  if (options?.assetType) {
    conditions.push(eq(criteriaVersions.assetType, options.assetType));
  }

  if (options?.targetMarket) {
    conditions.push(eq(criteriaVersions.targetMarket, options.targetMarket));
  }

  if (options?.isActive !== undefined) {
    conditions.push(eq(criteriaVersions.isActive, options.isActive));
  } else {
    // Default to only active criteria
    conditions.push(eq(criteriaVersions.isActive, true));
  }

  return db.query.criteriaVersions.findMany({
    where: and(...conditions),
    orderBy: [desc(criteriaVersions.updatedAt)],
  });
}

/**
 * Get criteria sets grouped by asset type
 *
 * Multi-tenant isolation: Only returns criteria belonging to the userId
 *
 * @param userId - User ID to fetch criteria sets for
 * @returns Map of asset type to criteria sets
 */
export async function getCriteriaByAssetType(
  userId: string
): Promise<Map<string, CriteriaVersion[]>> {
  const criteriaSets = await getCriteriaSetsForUser(userId);

  const grouped = new Map<string, CriteriaVersion[]>();

  for (const set of criteriaSets) {
    const existing = grouped.get(set.assetType) ?? [];
    existing.push(set);
    grouped.set(set.assetType, existing);
  }

  return grouped;
}

/**
 * Get a single criteria set by ID
 *
 * Multi-tenant isolation: Only returns if criteria belongs to the userId
 *
 * @param userId - User ID (for ownership verification)
 * @param criteriaId - Criteria version ID to fetch
 * @returns Criteria version or null if not found/not owned by user
 */
export async function getCriteriaById(
  userId: string,
  criteriaId: string
): Promise<CriteriaVersion | null> {
  const result = await db.query.criteriaVersions.findFirst({
    where: and(eq(criteriaVersions.id, criteriaId), eq(criteriaVersions.userId, userId)),
  });

  return result ?? null;
}

/**
 * Get the latest version of a criteria set by its name and asset type
 *
 * Used for finding existing versions when updating
 *
 * @param userId - User ID (for ownership verification)
 * @param assetType - Asset type of the criteria set
 * @param name - Name of the criteria set
 * @returns Latest criteria version or null
 */
export async function getLatestCriteriaByName(
  userId: string,
  assetType: string,
  name: string
): Promise<CriteriaVersion | null> {
  const result = await db.query.criteriaVersions.findFirst({
    where: and(
      eq(criteriaVersions.userId, userId),
      eq(criteriaVersions.assetType, assetType),
      eq(criteriaVersions.name, name)
    ),
    orderBy: [desc(criteriaVersions.version)],
  });

  return result ?? null;
}

/**
 * Create a new criteria set
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.1: Create new criterion set
 * AC-5.1.6: Creates version 1
 *
 * @param userId - User ID creating the criteria set
 * @param input - Criteria set creation input
 * @returns Created criteria version
 * @throws CriteriaSetLimitError if user already has too many criteria sets
 */
export async function createCriteriaSet(
  userId: string,
  input: CreateCriteriaSetInput
): Promise<CriteriaVersion> {
  // Check criteria set limit before creating
  const currentCount = await getCriteriaSetCount(userId);

  if (currentCount >= MAX_CRITERIA_SETS_PER_USER) {
    throw new CriteriaSetLimitError();
  }

  // Prepare criteria with generated IDs and sort orders
  const criteriaWithIds: CriterionRule[] = input.criteria.map((criterion, index) => ({
    id: criterion.id ?? generateUUID(),
    name: criterion.name,
    metric: criterion.metric,
    operator: criterion.operator,
    value: criterion.value,
    value2: criterion.value2 ?? undefined,
    points: criterion.points,
    requiredFundamentals: criterion.requiredFundamentals,
    sortOrder: criterion.sortOrder ?? index,
  }));

  const newCriteriaSet: NewCriteriaVersion = {
    userId,
    assetType: input.assetType,
    targetMarket: input.targetMarket,
    name: input.name,
    criteria: criteriaWithIds,
    version: 1,
    isActive: true,
  };

  const result = await db.insert(criteriaVersions).values(newCriteriaSet).returning();

  if (!result[0]) {
    throw new Error("Failed to create criteria set");
  }

  return result[0];
}

/**
 * Update a criteria set (creates new version - immutable versioning)
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.6: Creates new version, previous version unchanged
 *
 * Multi-tenant isolation: Verifies criteria ownership before updating
 *
 * @param userId - User ID (for ownership verification)
 * @param criteriaId - Criteria version ID to update
 * @param input - Partial update input
 * @returns New criteria version
 * @throws CriteriaNotFoundError if criteria doesn't exist or user doesn't own it
 */
export async function updateCriteriaSet(
  userId: string,
  criteriaId: string,
  input: UpdateCriteriaSetInput
): Promise<CriteriaVersion> {
  // Verify ownership
  const existingCriteria = await getCriteriaById(userId, criteriaId);

  if (!existingCriteria) {
    throw new CriteriaNotFoundError();
  }

  // If only updating isActive, do an in-place update (soft delete scenario)
  if (input.isActive !== undefined && !input.name && !input.targetMarket && !input.criteria) {
    const result = await db
      .update(criteriaVersions)
      .set({
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(criteriaVersions.id, criteriaId))
      .returning();

    if (!result[0]) {
      throw new Error("Failed to update criteria set");
    }

    return result[0];
  }

  // For other updates, create a new version (immutable versioning)
  // Mark old version as inactive
  await db
    .update(criteriaVersions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(criteriaVersions.id, criteriaId));

  // Create new version with updates
  const newCriteriaSet: NewCriteriaVersion = {
    userId,
    assetType: existingCriteria.assetType, // Asset type cannot be changed
    targetMarket: input.targetMarket ?? existingCriteria.targetMarket,
    name: input.name ?? existingCriteria.name,
    criteria: input.criteria ?? existingCriteria.criteria,
    version: existingCriteria.version + 1,
    isActive: true,
  };

  const result = await db.insert(criteriaVersions).values(newCriteriaSet).returning();

  if (!result[0]) {
    throw new Error("Failed to create new criteria version");
  }

  return result[0];
}

/**
 * Add a criterion to an existing criteria set (creates new version)
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.1: Add new criterion
 * AC-5.1.6: Creates new version
 *
 * @param userId - User ID (for ownership verification)
 * @param criteriaId - Criteria version ID to add criterion to
 * @param criterion - New criterion to add
 * @returns New criteria version with added criterion
 * @throws CriteriaNotFoundError if criteria doesn't exist or user doesn't own it
 */
export async function addCriterion(
  userId: string,
  criteriaId: string,
  criterion: CreateCriterionRuleInput
): Promise<CriteriaVersion> {
  // Verify ownership
  const existingCriteria = await getCriteriaById(userId, criteriaId);

  if (!existingCriteria) {
    throw new CriteriaNotFoundError();
  }

  // Get max sort order
  const maxSortOrder = existingCriteria.criteria.reduce(
    (max, c) => (c.sortOrder > max ? c.sortOrder : max),
    -1
  );

  // Add new criterion with generated ID
  const newCriterion: CriterionRule = {
    id: criterion.id ?? generateUUID(),
    name: criterion.name,
    metric: criterion.metric,
    operator: criterion.operator,
    value: criterion.value,
    value2: criterion.value2 ?? undefined,
    points: criterion.points,
    requiredFundamentals: criterion.requiredFundamentals,
    sortOrder: criterion.sortOrder ?? maxSortOrder + 1,
  };

  const updatedCriteria = [...existingCriteria.criteria, newCriterion];

  return updateCriteriaSet(userId, criteriaId, { criteria: updatedCriteria });
}

/**
 * Update a single criterion within a criteria set (creates new version)
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.4: Inline edit any field
 * AC-5.1.6: Creates new version
 *
 * @param userId - User ID (for ownership verification)
 * @param criteriaId - Criteria version ID
 * @param criterionId - Criterion ID to update
 * @param updates - Partial updates to apply
 * @returns New criteria version with updated criterion
 * @throws CriteriaNotFoundError if criteria doesn't exist or user doesn't own it
 * @throws CriterionNotFoundError if criterion doesn't exist in the set
 */
export async function updateCriterion(
  userId: string,
  criteriaId: string,
  criterionId: string,
  updates: UpdateCriterionInput
): Promise<CriteriaVersion> {
  // Verify ownership
  const existingCriteria = await getCriteriaById(userId, criteriaId);

  if (!existingCriteria) {
    throw new CriteriaNotFoundError();
  }

  // Find the criterion to update
  const criterionIndex = existingCriteria.criteria.findIndex((c) => c.id === criterionId);

  if (criterionIndex === -1) {
    throw new CriterionNotFoundError();
  }

  // Apply updates to the criterion
  const existingCriterion = existingCriteria.criteria[criterionIndex]!;
  const updatedCriterion: CriterionRule = {
    id: existingCriterion.id,
    name: updates.name ?? existingCriterion.name,
    metric: updates.metric ?? existingCriterion.metric,
    operator: updates.operator ?? existingCriterion.operator,
    value: updates.value ?? existingCriterion.value,
    value2: updates.value2 !== undefined ? updates.value2 : existingCriterion.value2,
    points: updates.points ?? existingCriterion.points,
    requiredFundamentals: updates.requiredFundamentals ?? existingCriterion.requiredFundamentals,
    sortOrder: updates.sortOrder ?? existingCriterion.sortOrder,
  };

  // Replace the criterion in the array
  const updatedCriteria = [...existingCriteria.criteria];
  updatedCriteria[criterionIndex] = updatedCriterion;

  return updateCriteriaSet(userId, criteriaId, { criteria: updatedCriteria });
}

/**
 * Delete a criterion from a criteria set (creates new version)
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.4: Delete option
 * AC-5.1.6: Creates new version without the criterion
 *
 * @param userId - User ID (for ownership verification)
 * @param criteriaId - Criteria version ID
 * @param criterionId - Criterion ID to delete
 * @returns New criteria version without the deleted criterion
 * @throws CriteriaNotFoundError if criteria doesn't exist or user doesn't own it
 * @throws CriterionNotFoundError if criterion doesn't exist in the set
 */
export async function deleteCriterion(
  userId: string,
  criteriaId: string,
  criterionId: string
): Promise<CriteriaVersion> {
  // Verify ownership
  const existingCriteria = await getCriteriaById(userId, criteriaId);

  if (!existingCriteria) {
    throw new CriteriaNotFoundError();
  }

  // Find the criterion to delete
  const criterionIndex = existingCriteria.criteria.findIndex((c) => c.id === criterionId);

  if (criterionIndex === -1) {
    throw new CriterionNotFoundError();
  }

  // Remove the criterion from the array
  const updatedCriteria = existingCriteria.criteria.filter((c) => c.id !== criterionId);

  // If this would leave the set empty, just mark it as inactive instead
  if (updatedCriteria.length === 0) {
    return updateCriteriaSet(userId, criteriaId, { isActive: false });
  }

  return updateCriteriaSet(userId, criteriaId, { criteria: updatedCriteria });
}

/**
 * Reorder criteria within a set (creates new version)
 *
 * Story 5.1: Define Scoring Criteria
 * AC-5.1.4: Drag handle for reordering
 * AC-5.1.6: Creates new version with updated sort orders
 *
 * @param userId - User ID (for ownership verification)
 * @param criteriaId - Criteria version ID
 * @param criterionIds - Ordered array of criterion IDs
 * @returns New criteria version with reordered criteria
 * @throws CriteriaNotFoundError if criteria doesn't exist or user doesn't own it
 */
export async function reorderCriteria(
  userId: string,
  criteriaId: string,
  criterionIds: string[]
): Promise<CriteriaVersion> {
  // Verify ownership
  const existingCriteria = await getCriteriaById(userId, criteriaId);

  if (!existingCriteria) {
    throw new CriteriaNotFoundError();
  }

  // Create a map of criterion ID to criterion
  const criterionMap = new Map(existingCriteria.criteria.map((c) => [c.id, c]));

  // Reorder based on provided IDs
  const reorderedCriteria: CriterionRule[] = criterionIds.map((id, index) => {
    const criterion = criterionMap.get(id);
    if (!criterion) {
      throw new CriterionNotFoundError();
    }
    return { ...criterion, sortOrder: index };
  });

  // Add any criteria not in the provided list at the end
  for (const criterion of existingCriteria.criteria) {
    if (!criterionIds.includes(criterion.id)) {
      reorderedCriteria.push({ ...criterion, sortOrder: reorderedCriteria.length });
    }
  }

  return updateCriteriaSet(userId, criteriaId, { criteria: reorderedCriteria });
}

/**
 * Soft delete a criteria set
 *
 * Story 5.1: Define Scoring Criteria
 *
 * Multi-tenant isolation: Verifies criteria ownership before deleting
 *
 * @param userId - User ID (for ownership verification)
 * @param criteriaId - Criteria version ID to delete
 * @throws CriteriaNotFoundError if criteria doesn't exist or user doesn't own it
 */
export async function deleteCriteriaSet(userId: string, criteriaId: string): Promise<void> {
  // Verify ownership
  const existingCriteria = await getCriteriaById(userId, criteriaId);

  if (!existingCriteria) {
    throw new CriteriaNotFoundError();
  }

  // Soft delete - mark as inactive
  await db
    .update(criteriaVersions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(criteriaVersions.id, criteriaId));
}

/**
 * Check if user can create more criteria sets
 *
 * @param userId - User ID to check
 * @returns true if user can create more criteria sets
 */
export async function canCreateCriteriaSet(userId: string): Promise<boolean> {
  const currentCount = await getCriteriaSetCount(userId);
  return currentCount < MAX_CRITERIA_SETS_PER_USER;
}

/**
 * Get version history for a criteria set
 *
 * @param userId - User ID (for ownership verification)
 * @param assetType - Asset type
 * @param name - Criteria set name
 * @returns Array of all versions ordered by version number descending
 */
export async function getCriteriaVersionHistory(
  userId: string,
  assetType: string,
  name: string
): Promise<CriteriaVersion[]> {
  return db.query.criteriaVersions.findMany({
    where: and(
      eq(criteriaVersions.userId, userId),
      eq(criteriaVersions.assetType, assetType),
      eq(criteriaVersions.name, name)
    ),
    orderBy: [desc(criteriaVersions.version)],
  });
}

/**
 * Summary of criteria configuration
 */
export interface CriteriaSummary {
  totalSets: number;
  activeSet: number;
  byAssetType: Record<string, number>;
  totalCriteria: number;
}

/**
 * Get criteria summary for a user
 *
 * @param userId - User ID to get summary for
 * @returns Summary of criteria configuration
 */
export async function getCriteriaSummary(userId: string): Promise<CriteriaSummary> {
  // Get all sets (both active and inactive) by not filtering by isActive
  const activeSets = await getCriteriaSetsForUser(userId, { isActive: true });
  const inactiveSets = await getCriteriaSetsForUser(userId, { isActive: false });
  const allSets = [...activeSets, ...inactiveSets];

  const byAssetType: Record<string, number> = {};
  let totalCriteria = 0;

  for (const set of activeSets) {
    byAssetType[set.assetType] = (byAssetType[set.assetType] ?? 0) + 1;
    totalCriteria += set.criteria.length;
  }

  return {
    totalSets: allSets.length,
    activeSet: activeSets.length,
    byAssetType,
    totalCriteria,
  };
}

// =============================================================================
// COPY CRITERIA SET (Story 5.5)
// =============================================================================

/**
 * Result of copy operation
 */
export interface CopyCriteriaResult {
  criteriaVersion: CriteriaVersion;
  copiedCount: number;
}

/**
 * Generate a unique copy name with (Copy), (Copy 2), (Copy 3) suffix
 *
 * Story 5.5: Copy Criteria Set
 * AC-5.5.3: Copied Criteria Naming
 *
 * @param baseName - Original name or user-provided name
 * @param existingNames - Array of existing criteria set names in target market
 * @returns Unique name with appropriate suffix
 */
export function generateCopyName(baseName: string, existingNames: string[]): string {
  // If name doesn't exist, use it as-is
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  // Try "(Copy)" suffix first
  const copyName = `${baseName} (Copy)`;
  if (!existingNames.includes(copyName)) {
    return copyName;
  }

  // Try "(Copy 2)", "(Copy 3)", etc.
  let counter = 2;
  while (counter <= 100) {
    const numberedName = `${baseName} (Copy ${counter})`;
    if (!existingNames.includes(numberedName)) {
      return numberedName;
    }
    counter++;
  }

  // Fallback with timestamp (extremely unlikely to reach)
  return `${baseName} (Copy ${Date.now()})`;
}

/**
 * Copy a criteria set to create a new variation
 *
 * Story 5.5: Copy Criteria Set
 * AC-5.5.1: Copy action available
 * AC-5.5.2: Target market selection
 * AC-5.5.3: Copied criteria naming with (Copy) suffix
 * AC-5.5.4: New UUIDs assigned, sortOrder preserved
 *
 * Multi-tenant isolation: Verifies source ownership before copying
 *
 * @param userId - User ID (for ownership verification and new set ownership)
 * @param sourceCriteriaId - ID of criteria set to copy
 * @param options - Optional name and target market overrides
 * @returns New criteria version with copied count
 * @throws CriteriaNotFoundError if source doesn't exist or user doesn't own it
 * @throws CriteriaSetLimitError if user has reached maximum criteria sets
 */
export async function copyCriteriaSet(
  userId: string,
  sourceCriteriaId: string,
  options: CopyCriteriaInput = {}
): Promise<CopyCriteriaResult> {
  // 1. Verify source ownership
  const sourceCriteria = await getCriteriaById(userId, sourceCriteriaId);

  if (!sourceCriteria) {
    throw new CriteriaNotFoundError();
  }

  // 2. Check criteria set limit
  const currentCount = await getCriteriaSetCount(userId);

  if (currentCount >= MAX_CRITERIA_SETS_PER_USER) {
    throw new CriteriaSetLimitError();
  }

  // 3. Determine target market (use source market if not specified)
  const targetMarket = options.targetMarket ?? sourceCriteria.targetMarket;

  // 4. Get existing names in target market for uniqueness check
  const existingSets = await getCriteriaSetsForUser(userId, {
    assetType: sourceCriteria.assetType,
    targetMarket: targetMarket,
  });
  const existingNames = existingSets.map((s) => s.name);

  // 5. Generate unique name
  const baseName = options.name ?? sourceCriteria.name;
  const uniqueName = generateCopyName(baseName, existingNames);

  // 6. Clone criteria rules with new UUIDs, preserving sortOrder
  const copiedCriteria: CriterionRule[] = sourceCriteria.criteria.map((criterion) => ({
    id: generateUUID(),
    name: criterion.name,
    metric: criterion.metric,
    operator: criterion.operator,
    value: criterion.value,
    value2: criterion.value2,
    points: criterion.points,
    requiredFundamentals: criterion.requiredFundamentals,
    sortOrder: criterion.sortOrder,
  }));

  // 7. Create new criteria version
  const newCriteriaSet: NewCriteriaVersion = {
    userId,
    assetType: sourceCriteria.assetType,
    targetMarket,
    name: uniqueName,
    criteria: copiedCriteria,
    version: 1,
    isActive: true,
  };

  const result = await db.insert(criteriaVersions).values(newCriteriaSet).returning();

  if (!result[0]) {
    throw new Error("Failed to create copied criteria set");
  }

  return {
    criteriaVersion: result[0],
    copiedCount: copiedCriteria.length,
  };
}
