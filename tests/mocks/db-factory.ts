/**
 * Database Mock Factory for Vitest
 *
 * Story 1.7: Enable All Skipped Tests
 * AC 1.7.2: Database Unit Tests Enabled
 *
 * Provides a configurable mock database factory for unit tests that
 * need to test database-dependent code without a real database connection.
 *
 * Usage:
 * ```typescript
 * import { createMockDbState, configureMockDb } from "../../mocks/db-factory";
 *
 * // Create state at the module level
 * const mockDbState = createMockDbState();
 *
 * // Configure vi.mock with state
 * vi.mock("@/lib/db", () => configureMockDb(mockDbState));
 *
 * // In tests, modify state as needed
 * mockDbState.tables.users = [{ id: "1", email: "test@example.com" }];
 * ```
 */

import { vi } from "vitest";

/**
 * Mock table data storage
 */
export interface MockDbTables {
  portfolios: Array<{ id: string; userId: string; [key: string]: unknown }>;
  portfolioAssets: Array<{
    id: string;
    portfolioId: string;
    symbol: string;
    [key: string]: unknown;
  }>;
  users: Array<{ id: string; email: string; [key: string]: unknown }>;
  criteriaVersions: Array<{ id: string; userId: string; [key: string]: unknown }>;
  scores: Array<{ id: string; assetId: string; [key: string]: unknown }>;
  [key: string]: Array<Record<string, unknown>>;
}

/**
 * Mock database state that can be configured per test
 */
export interface MockDbState {
  tables: MockDbTables;
  insertResults: Record<string, unknown[]>;
  countResults: Record<string, number>;
}

/**
 * Creates a fresh mock database state
 */
export function createMockDbState(): MockDbState {
  return {
    tables: {
      portfolios: [],
      portfolioAssets: [],
      users: [],
      criteriaVersions: [],
      scores: [],
    },
    insertResults: {},
    countResults: {},
  };
}

/**
 * Creates a chainable query builder that resolves to filtered data
 */
function createChainableQuery(getData: () => unknown[]) {
  const chainable = {
    // These methods return the chainable for fluent API
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),

    // Terminal operations that return data
    limit: vi.fn().mockImplementation(() => Promise.resolve(getData())),
    execute: vi.fn().mockImplementation(() => Promise.resolve(getData())),

    // Make it thenable so await works directly
    then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) =>
      Promise.resolve(getData()).then(resolve, reject),
  };

  return chainable;
}

/**
 * Configures a mock database module compatible with @/lib/db
 *
 * @param state - The mock state object to use
 * @returns Mock module configuration for vi.mock()
 */
export function configureMockDb(state: MockDbState) {
  return {
    db: {
      // Select builder
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: { name?: string }) => {
          const tableName = table?.name || "unknown";
          const getData = () => state.tables[tableName] || [];
          return createChainableQuery(getData);
        }),
      })),

      // Insert builder
      insert: vi.fn().mockImplementation((table: { name?: string }) => ({
        values: vi.fn().mockImplementation((data: unknown) => ({
          returning: vi.fn().mockImplementation(() => {
            const tableName = table?.name || "unknown";
            const results = state.insertResults[tableName] || [data];
            return Promise.resolve(results);
          }),
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          onConflictDoNothing: vi.fn().mockReturnThis(),
        })),
      })),

      // Update builder
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })),

      // Delete builder
      delete: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),

      // Query builder (for Drizzle's relational queries)
      query: {
        portfolios: {
          findFirst: vi
            .fn()
            .mockImplementation(() => Promise.resolve(state.tables.portfolios[0] || null)),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(state.tables.portfolios)),
        },
        portfolioAssets: {
          findFirst: vi
            .fn()
            .mockImplementation(() => Promise.resolve(state.tables.portfolioAssets[0] || null)),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(state.tables.portfolioAssets)),
        },
        criteriaVersions: {
          findFirst: vi
            .fn()
            .mockImplementation(() => Promise.resolve(state.tables.criteriaVersions[0] || null)),
          findMany: vi
            .fn()
            .mockImplementation(() => Promise.resolve(state.tables.criteriaVersions)),
        },
        users: {
          findFirst: vi
            .fn()
            .mockImplementation(() => Promise.resolve(state.tables.users[0] || null)),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(state.tables.users)),
        },
      },
    },
  };
}

/**
 * Helper to reset mock state between tests
 */
export function resetMockDbState(state: MockDbState): void {
  state.tables = {
    portfolios: [],
    portfolioAssets: [],
    users: [],
    criteriaVersions: [],
    scores: [],
  };
  state.insertResults = {};
  state.countResults = {};
}
