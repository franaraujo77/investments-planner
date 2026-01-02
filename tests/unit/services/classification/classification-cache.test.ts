/**
 * Classification Cache Service Unit Tests
 *
 * Story 5.7: Industry/Sector Classification Cache
 * AC-5.7.3: Two-Tier Cache - PostgreSQL + Vercel KV
 * AC-5.7.4: Asset-to-Classification Mapping
 *
 * Tests the cache layer with mocked database and KV operations.
 *
 * @module tests/unit/services/classification/classification-cache.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClassificationResult } from "@/lib/providers/types";

// Mock Vercel KV
const mockKvGet = vi.fn();
const mockKvSet = vi.fn();
const mockKvDel = vi.fn();
const mockKvMget = vi.fn();
const mockPipelineExec = vi.fn();
const mockPipeline = vi.fn(() => ({
  set: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  exec: mockPipelineExec,
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: (...args: unknown[]) => mockKvGet(...args),
    set: (...args: unknown[]) => mockKvSet(...args),
    del: (...args: unknown[]) => mockKvDel(...args),
    mget: (...args: unknown[]) => mockKvMget(...args),
    pipeline: mockPipeline,
  },
}));

// Mock database
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockDbSelect(),
    insert: () => mockDbInsert(),
    transaction: (fn: (tx: unknown) => Promise<unknown>) => mockDbTransaction(fn),
  },
}));

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// CACHE KEY TESTS
// =============================================================================

describe("Classification Cache Key Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should normalize symbols to uppercase in cache keys", async () => {
    // Set up mock to return null (cache miss)
    mockKvGet.mockResolvedValue(null);
    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getClassification } =
      await import("@/lib/services/classification/classification-cache");

    await getClassification("aapl");

    // Verify KV was called with uppercase key
    expect(mockKvGet).toHaveBeenCalledWith("classification:AAPL");
  });
});

// =============================================================================
// KV CACHE BEHAVIOR TESTS
// =============================================================================

describe("KV Cache Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return from KV cache when data exists", async () => {
    const cachedData = {
      symbol: "AAPL",
      gicsIndustryId: "451030",
      industryName: "Software",
      gicsIndustryGroupId: "4510",
      industryGroupName: "Software & Services",
      gicsSectorId: "45",
      sectorName: "Information Technology",
      confidence: "0.95",
      source: "test",
      cacheUpdatedAt: new Date(),
    };

    mockKvGet.mockResolvedValue(cachedData);

    const { getClassification } =
      await import("@/lib/services/classification/classification-cache");

    const result = await getClassification("AAPL");

    expect(result.fromKvCache).toBe(true);
    expect(result.fromDb).toBe(false);
    expect(result.classification).toEqual(cachedData);
    // DB should not be queried
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("should fall back to DB when KV cache misses", async () => {
    mockKvGet.mockResolvedValue(null);

    const dbResult = {
      symbol: "AAPL",
      gicsIndustryId: "451030",
      confidence: "0.95",
      source: "test",
      cacheUpdatedAt: new Date(),
      industryName: "Software",
      industryGroupId: "4510",
      industryGroupName: "Software & Services",
      sectorId: "45",
      sectorName: "Information Technology",
    };

    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve([dbResult]),
              }),
            }),
          }),
        }),
      }),
    });

    mockKvSet.mockResolvedValue("OK");

    const { getClassification } =
      await import("@/lib/services/classification/classification-cache");

    const result = await getClassification("AAPL");

    expect(result.fromKvCache).toBe(false);
    expect(result.fromDb).toBe(true);
    expect(result.classification).toBeDefined();
    // Should populate KV cache
    expect(mockKvSet).toHaveBeenCalled();
  });

  it("should handle KV cache read errors gracefully", async () => {
    mockKvGet.mockRejectedValue(new Error("KV connection failed"));

    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getClassification } =
      await import("@/lib/services/classification/classification-cache");

    // Should not throw, should fall back to DB
    const result = await getClassification("AAPL");

    expect(result.classification).toBeNull();
    expect(result.fromKvCache).toBe(false);
  });

  it("should handle KV cache write errors gracefully", async () => {
    mockKvGet.mockResolvedValue(null);
    mockKvSet.mockRejectedValue(new Error("KV write failed"));

    const dbResult = {
      symbol: "AAPL",
      gicsIndustryId: "451030",
      confidence: "0.95",
      source: "test",
      cacheUpdatedAt: new Date(),
      industryName: "Software",
      industryGroupId: "4510",
      industryGroupName: "Software & Services",
      sectorId: "45",
      sectorName: "Information Technology",
    };

    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve([dbResult]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getClassification } =
      await import("@/lib/services/classification/classification-cache");

    // Should not throw despite KV write failure
    const result = await getClassification("AAPL");

    expect(result.classification).toBeDefined();
    expect(result.fromDb).toBe(true);
  });
});

// =============================================================================
// BATCH OPERATIONS TESTS
// =============================================================================

describe("Batch Classification Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use mget for batch KV reads", async () => {
    mockKvMget.mockResolvedValue([null, null]);

    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    });

    const { getClassifications } =
      await import("@/lib/services/classification/classification-cache");

    await getClassifications(["AAPL", "MSFT"]);

    // Should use batch mget
    expect(mockKvMget).toHaveBeenCalledWith("classification:AAPL", "classification:MSFT");
  });

  it("should use pipeline for batch KV writes", async () => {
    mockKvMget.mockResolvedValue([null, null]);
    mockPipelineExec.mockResolvedValue([]);

    const dbResults = [
      {
        symbol: "AAPL",
        gicsIndustryId: "451030",
        confidence: "0.95",
        source: "test",
        cacheUpdatedAt: new Date(),
        industryName: "Software",
        industryGroupId: "4510",
        industryGroupName: "Software & Services",
        sectorId: "45",
        sectorName: "Information Technology",
      },
      {
        symbol: "MSFT",
        gicsIndustryId: "451030",
        confidence: "0.95",
        source: "test",
        cacheUpdatedAt: new Date(),
        industryName: "Software",
        industryGroupId: "4510",
        industryGroupName: "Software & Services",
        sectorId: "45",
        sectorName: "Information Technology",
      },
    ];

    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => Promise.resolve(dbResults),
            }),
          }),
        }),
      }),
    });

    const { getClassifications } =
      await import("@/lib/services/classification/classification-cache");

    await getClassifications(["AAPL", "MSFT"]);

    // Should use pipeline for batch cache writes
    expect(mockPipeline).toHaveBeenCalled();
    expect(mockPipelineExec).toHaveBeenCalled();
  });
});

// =============================================================================
// STORE CLASSIFICATION TESTS
// =============================================================================

describe("Store Classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should store classification in DB and invalidate KV cache", async () => {
    mockDbInsert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    });
    mockKvDel.mockResolvedValue(1);

    const { storeClassification } =
      await import("@/lib/services/classification/classification-cache");

    const classification: ClassificationResult = {
      symbol: "AAPL",
      gicsIndustryId: "451030",
      gicsIndustryGroupId: "4510",
      gicsSectorId: "45",
      industryName: "Software",
      industryGroupName: "Software & Services",
      sectorName: "Information Technology",
      confidence: "0.95",
      source: "test",
      fetchedAt: new Date(),
    };

    await storeClassification(classification);

    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockKvDel).toHaveBeenCalledWith("classification:AAPL");
  });

  it("should normalize symbol to uppercase when storing", async () => {
    mockDbInsert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    });
    mockKvDel.mockResolvedValue(1);

    const { storeClassification } =
      await import("@/lib/services/classification/classification-cache");

    const classification: ClassificationResult = {
      symbol: "aapl", // lowercase
      gicsIndustryId: "451030",
      gicsIndustryGroupId: "4510",
      gicsSectorId: "45",
      industryName: "Software",
      industryGroupName: "Software & Services",
      sectorName: "Information Technology",
      confidence: "0.95",
      source: "test",
      fetchedAt: new Date(),
    };

    await storeClassification(classification);

    // Should invalidate uppercase key
    expect(mockKvDel).toHaveBeenCalledWith("classification:AAPL");
  });
});

// =============================================================================
// BATCH STORE TESTS
// =============================================================================

describe("Batch Store Classifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use transaction for batch DB inserts", async () => {
    mockDbTransaction.mockImplementation(async (fn) => {
      const mockTx = {
        insert: () => ({
          values: () => ({
            onConflictDoUpdate: () => Promise.resolve(),
          }),
        }),
      };
      return fn(mockTx);
    });
    mockPipelineExec.mockResolvedValue([]);

    const { storeClassifications } =
      await import("@/lib/services/classification/classification-cache");

    const classifications: ClassificationResult[] = [
      {
        symbol: "AAPL",
        gicsIndustryId: "451030",
        gicsIndustryGroupId: "4510",
        gicsSectorId: "45",
        industryName: "Software",
        industryGroupName: "Software & Services",
        sectorName: "Information Technology",
        confidence: "0.95",
        source: "test",
        fetchedAt: new Date(),
      },
      {
        symbol: "MSFT",
        gicsIndustryId: "451030",
        gicsIndustryGroupId: "4510",
        gicsSectorId: "45",
        industryName: "Software",
        industryGroupName: "Software & Services",
        sectorName: "Information Technology",
        confidence: "0.95",
        source: "test",
        fetchedAt: new Date(),
      },
    ];

    await storeClassifications(classifications);

    // Should use transaction
    expect(mockDbTransaction).toHaveBeenCalled();
    // Should use pipeline for batch invalidation
    expect(mockPipeline).toHaveBeenCalled();
  });

  it("should handle empty array gracefully", async () => {
    const { storeClassifications } =
      await import("@/lib/services/classification/classification-cache");

    await storeClassifications([]);

    // Should not call DB or KV
    expect(mockDbTransaction).not.toHaveBeenCalled();
    expect(mockPipeline).not.toHaveBeenCalled();
  });
});

// =============================================================================
// CACHE TTL TESTS
// =============================================================================

describe("Cache TTL Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set 7-day TTL when caching to KV", async () => {
    mockKvGet.mockResolvedValue(null);

    const dbResult = {
      symbol: "AAPL",
      gicsIndustryId: "451030",
      confidence: "0.95",
      source: "test",
      cacheUpdatedAt: new Date(),
      industryName: "Software",
      industryGroupId: "4510",
      industryGroupName: "Software & Services",
      sectorId: "45",
      sectorName: "Information Technology",
    };

    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve([dbResult]),
              }),
            }),
          }),
        }),
      }),
    });

    mockKvSet.mockResolvedValue("OK");

    const { getClassification } =
      await import("@/lib/services/classification/classification-cache");

    await getClassification("AAPL");

    // Verify TTL is 7 days in seconds
    const expectedTtl = 7 * 24 * 60 * 60; // 604800 seconds
    expect(mockKvSet).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
      ex: expectedTtl,
    });
  });
});

// =============================================================================
// NOT FOUND HANDLING TESTS
// =============================================================================

describe("Not Found Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null classification when not in cache or DB", async () => {
    mockKvGet.mockResolvedValue(null);

    mockDbSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        }),
      }),
    });

    const { getClassification } =
      await import("@/lib/services/classification/classification-cache");

    const result = await getClassification("UNKNOWN");

    expect(result.classification).toBeNull();
    expect(result.fromKvCache).toBe(false);
    expect(result.fromDb).toBe(false);
  });
});
