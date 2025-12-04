/**
 * Allocation Service
 *
 * Story 3.7: Allocation Percentage View
 * AC-3.7.1 - AC-3.7.7: Allocation visualization and calculations
 *
 * Aggregates portfolio assets by class and subclass for allocation visualization.
 * Uses decimal.js for all percentage calculations per architecture requirements.
 *
 * Note: Since Epic 4 (Asset Class Configuration) is not yet implemented,
 * this service handles missing classes gracefully by showing "Unclassified".
 */

import { Decimal } from "@/lib/calculations/decimal-config";
import {
  getPortfolioWithValues,
  type AssetWithValue,
  type PortfolioWithValues,
} from "./portfolio-service";
import type { AllocationStatus } from "@/components/fintech/allocation-gauge";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Allocation for a single asset class
 */
export interface ClassAllocation {
  classId: string;
  className: string;
  /** Total value of assets in this class (in base currency) */
  value: string;
  /** Percentage of total portfolio (1 decimal precision) */
  percentage: string;
  /** Number of assets in this class */
  assetCount: number;
  /** Target minimum percentage (null if not configured) */
  targetMin: string | null;
  /** Target maximum percentage (null if not configured) */
  targetMax: string | null;
  /** Status relative to target */
  status: AllocationStatus;
  /** Subclass breakdown within this class */
  subclasses: SubclassAllocation[];
}

/**
 * Allocation for a single subclass within a class
 */
export interface SubclassAllocation {
  subclassId: string;
  subclassName: string;
  /** Total value of assets in this subclass (in base currency) */
  value: string;
  /** Percentage within parent class */
  percentageOfClass: string;
  /** Percentage of total portfolio */
  percentageOfPortfolio: string;
  /** Number of assets in this subclass */
  assetCount: number;
}

/**
 * Full allocation breakdown response
 */
export interface AllocationBreakdown {
  /** Allocations by asset class */
  classes: ClassAllocation[];
  /** Assets without a class assignment */
  unclassified: {
    value: string;
    percentage: string;
    assetCount: number;
  };
  /** Total portfolio value in base currency */
  totalValueBase: string;
  /** Total active (non-ignored) value used for percentage calculations */
  totalActiveValueBase: string;
  /** User's base currency */
  baseCurrency: string;
  /** Data freshness timestamp */
  dataFreshness: Date;
}

// =============================================================================
// MOCK ASSET CLASSES (Placeholder until Epic 4)
// =============================================================================

/**
 * Mock asset class configuration
 * These will be replaced by user-configured classes in Epic 4
 *
 * For MVP, we provide some common asset classes for testing/demo purposes.
 * Assets without assetClassId will be shown as "Unclassified".
 */
interface MockAssetClass {
  id: string;
  name: string;
  targetMin: string | null;
  targetMax: string | null;
  subclasses: { id: string; name: string }[];
}

const MOCK_ASSET_CLASSES: MockAssetClass[] = [
  {
    id: "stocks",
    name: "Stocks",
    targetMin: "50",
    targetMax: "70",
    subclasses: [
      { id: "us-stocks", name: "US Stocks" },
      { id: "intl-stocks", name: "International Stocks" },
      { id: "emerging-stocks", name: "Emerging Markets" },
    ],
  },
  {
    id: "bonds",
    name: "Bonds",
    targetMin: "20",
    targetMax: "30",
    subclasses: [
      { id: "govt-bonds", name: "Government Bonds" },
      { id: "corp-bonds", name: "Corporate Bonds" },
    ],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    targetMin: "5",
    targetMax: "15",
    subclasses: [
      { id: "reits", name: "REITs" },
      { id: "direct-property", name: "Direct Property" },
    ],
  },
  {
    id: "crypto",
    name: "Cryptocurrency",
    targetMin: null, // No target set for crypto
    targetMax: null,
    subclasses: [
      { id: "bitcoin", name: "Bitcoin" },
      { id: "altcoins", name: "Altcoins" },
    ],
  },
  {
    id: "cash",
    name: "Cash & Equivalents",
    targetMin: "5",
    targetMax: "10",
    subclasses: [],
  },
];

/**
 * Get mock asset class by ID
 * In production (Epic 4), this would query the database
 */
function getMockAssetClass(classId: string | null): MockAssetClass | null {
  if (!classId) return null;
  return MOCK_ASSET_CLASSES.find((c) => c.id === classId) ?? null;
}

/**
 * Get mock subclass by ID
 */
function getMockSubclass(
  classId: string | null,
  subclassId: string | null
): { id: string; name: string } | null {
  if (!classId || !subclassId) return null;
  const assetClass = getMockAssetClass(classId);
  if (!assetClass) return null;
  return assetClass.subclasses.find((s) => s.id === subclassId) ?? null;
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate allocation status based on current vs target
 * CRITICAL: Uses decimal.js for precise comparison
 *
 * AC-3.7.5: Status color coding
 */
export function calculateAllocationStatus(
  current: string,
  targetMin: string | null,
  targetMax: string | null
): AllocationStatus {
  if (targetMin === null || targetMax === null) {
    return "no-target";
  }

  try {
    const curr = new Decimal(current);
    const min = new Decimal(targetMin);
    const max = new Decimal(targetMax);

    if (curr.lessThan(min)) return "under";
    if (curr.greaterThan(max)) return "over";
    return "on-target";
  } catch {
    return "no-target";
  }
}

// Re-export from client-safe utils for backward compatibility
export { formatAllocationPercent } from "@/lib/calculations/allocation-utils";

/**
 * Calculate percentage of value relative to total
 * CRITICAL: Uses decimal.js for precise calculation
 */
function calculatePercentage(value: string, total: string): string {
  try {
    const val = new Decimal(value);
    const tot = new Decimal(total);

    if (tot.isZero()) {
      return "0.0000";
    }

    return val.dividedBy(tot).times(100).toFixed(4);
  } catch {
    return "0.0000";
  }
}

// =============================================================================
// MAIN SERVICE FUNCTIONS
// =============================================================================

/**
 * Get allocation breakdown for a portfolio
 *
 * Aggregates assets by class and subclass, calculates percentages,
 * and determines status relative to targets.
 *
 * @param userId - User ID (for ownership verification)
 * @param portfolioId - Portfolio ID to analyze
 * @returns AllocationBreakdown with class/subclass allocations
 */
export async function getAllocationBreakdown(
  userId: string,
  portfolioId: string
): Promise<AllocationBreakdown> {
  // Get portfolio with calculated values
  const portfolioData: PortfolioWithValues = await getPortfolioWithValues(userId, portfolioId);

  const { assets, totalActiveValueBase, baseCurrency, dataFreshness } = portfolioData;

  // Filter to active assets only (ignored assets excluded from allocation)
  const activeAssets = assets.filter((a) => !a.isIgnored);

  // Group assets by class
  const classBuckets = new Map<
    string,
    {
      assets: AssetWithValue[];
      classInfo: MockAssetClass | null;
    }
  >();

  // Track unclassified assets
  const unclassifiedAssets: AssetWithValue[] = [];

  for (const asset of activeAssets) {
    // For MVP, we use a simple mapping based on symbol patterns
    // In Epic 4, this would use asset.assetClassId from database
    const classId = inferAssetClass(asset);

    if (classId) {
      const existing = classBuckets.get(classId);
      if (existing) {
        existing.assets.push(asset);
      } else {
        classBuckets.set(classId, {
          assets: [asset],
          classInfo: getMockAssetClass(classId),
        });
      }
    } else {
      unclassifiedAssets.push(asset);
    }
  }

  // Calculate allocations for each class
  const classAllocations: ClassAllocation[] = [];

  for (const [classId, bucket] of classBuckets) {
    const { assets: classAssets, classInfo } = bucket;

    // Calculate total value for this class
    let classValue = new Decimal(0);
    for (const asset of classAssets) {
      classValue = classValue.plus(new Decimal(asset.valueBase));
    }
    const classValueStr = classValue.toFixed(4);

    // Calculate percentage of total portfolio
    const percentage = calculatePercentage(classValueStr, totalActiveValueBase);

    // Calculate subclass allocations
    const subclassAllocations = calculateSubclassAllocations(
      classAssets,
      classValueStr,
      totalActiveValueBase,
      classInfo
    );

    // Determine status
    const status = calculateAllocationStatus(
      percentage,
      classInfo?.targetMin ?? null,
      classInfo?.targetMax ?? null
    );

    classAllocations.push({
      classId,
      className: classInfo?.name ?? classId,
      value: classValueStr,
      percentage,
      assetCount: classAssets.length,
      targetMin: classInfo?.targetMin ?? null,
      targetMax: classInfo?.targetMax ?? null,
      status,
      subclasses: subclassAllocations,
    });
  }

  // Sort by percentage (descending)
  classAllocations.sort((a, b) => {
    return parseFloat(b.percentage) - parseFloat(a.percentage);
  });

  // Calculate unclassified totals
  let unclassifiedValue = new Decimal(0);
  for (const asset of unclassifiedAssets) {
    unclassifiedValue = unclassifiedValue.plus(new Decimal(asset.valueBase));
  }
  const unclassifiedValueStr = unclassifiedValue.toFixed(4);
  const unclassifiedPercentage = calculatePercentage(unclassifiedValueStr, totalActiveValueBase);

  return {
    classes: classAllocations,
    unclassified: {
      value: unclassifiedValueStr,
      percentage: unclassifiedPercentage,
      assetCount: unclassifiedAssets.length,
    },
    totalValueBase: portfolioData.totalValueBase,
    totalActiveValueBase,
    baseCurrency,
    dataFreshness,
  };
}

/**
 * Calculate subclass allocations within a class
 */
function calculateSubclassAllocations(
  classAssets: AssetWithValue[],
  classValue: string,
  totalPortfolioValue: string,
  classInfo: MockAssetClass | null
): SubclassAllocation[] {
  if (!classInfo || classInfo.subclasses.length === 0) {
    return [];
  }

  // Group by subclass
  const subclassBuckets = new Map<string, AssetWithValue[]>();

  for (const asset of classAssets) {
    const subclassId = inferAssetSubclass(asset, classInfo);
    if (subclassId) {
      const existing = subclassBuckets.get(subclassId);
      if (existing) {
        existing.push(asset);
      } else {
        subclassBuckets.set(subclassId, [asset]);
      }
    }
  }

  const subclassAllocations: SubclassAllocation[] = [];

  for (const [subclassId, subAssets] of subclassBuckets) {
    // Calculate total value for this subclass
    let subValue = new Decimal(0);
    for (const asset of subAssets) {
      subValue = subValue.plus(new Decimal(asset.valueBase));
    }
    const subValueStr = subValue.toFixed(4);

    // Calculate percentages
    const percentageOfClass = calculatePercentage(subValueStr, classValue);
    const percentageOfPortfolio = calculatePercentage(subValueStr, totalPortfolioValue);

    // Get subclass info
    const subclassInfo = getMockSubclass(classInfo.id, subclassId);

    subclassAllocations.push({
      subclassId,
      subclassName: subclassInfo?.name ?? subclassId,
      value: subValueStr,
      percentageOfClass,
      percentageOfPortfolio,
      assetCount: subAssets.length,
    });
  }

  // Sort by percentage (descending)
  subclassAllocations.sort((a, b) => {
    return parseFloat(b.percentageOfClass) - parseFloat(a.percentageOfClass);
  });

  return subclassAllocations;
}

// =============================================================================
// ASSET CLASS INFERENCE (MVP - to be replaced by Epic 4)
// =============================================================================

/**
 * Infer asset class from symbol patterns
 * This is a temporary solution for MVP. Epic 4 will provide proper
 * user-configurable asset class assignments.
 */
function inferAssetClass(asset: AssetWithValue): string | null {
  const symbol = asset.symbol.toUpperCase();

  // Common stock ETFs and indices
  if (
    symbol.includes("SPY") ||
    symbol.includes("VOO") ||
    symbol.includes("VTI") ||
    symbol.includes("QQQ") ||
    symbol.includes("VT") ||
    symbol.endsWith(".US")
  ) {
    return "stocks";
  }

  // International stock ETFs
  if (
    symbol.includes("VEA") ||
    symbol.includes("VWO") ||
    symbol.includes("IEMG") ||
    symbol.includes("EFA")
  ) {
    return "stocks";
  }

  // Bond ETFs
  if (
    symbol.includes("BND") ||
    symbol.includes("AGG") ||
    symbol.includes("TLT") ||
    symbol.includes("IEF") ||
    symbol.includes("LQD")
  ) {
    return "bonds";
  }

  // Real estate ETFs
  if (symbol.includes("VNQ") || symbol.includes("REIT") || symbol.includes("IYR")) {
    return "real-estate";
  }

  // Cryptocurrencies
  if (
    symbol.includes("BTC") ||
    symbol.includes("ETH") ||
    symbol.includes("CRYPTO") ||
    symbol === "BITCOIN" ||
    symbol === "ETHEREUM"
  ) {
    return "crypto";
  }

  // Common individual stocks (assume stocks category)
  const commonStocks = [
    "AAPL",
    "GOOGL",
    "GOOG",
    "MSFT",
    "AMZN",
    "META",
    "NVDA",
    "TSLA",
    "JPM",
    "V",
    "MA",
    "JNJ",
    "PG",
    "UNH",
    "HD",
    "DIS",
  ];
  if (commonStocks.includes(symbol)) {
    return "stocks";
  }

  // Default: return null (unclassified)
  return null;
}

/**
 * Infer asset subclass from symbol patterns
 * This is a temporary solution for MVP.
 */
function inferAssetSubclass(asset: AssetWithValue, classInfo: MockAssetClass): string | null {
  if (classInfo.subclasses.length === 0) {
    return null;
  }

  const symbol = asset.symbol.toUpperCase();

  // Stock subclasses
  if (classInfo.id === "stocks") {
    if (symbol.includes("VEA") || symbol.includes("EFA") || symbol.includes("IEFA")) {
      return "intl-stocks";
    }
    if (symbol.includes("VWO") || symbol.includes("IEMG") || symbol.includes("EEM")) {
      return "emerging-stocks";
    }
    return "us-stocks"; // Default for stocks
  }

  // Bond subclasses
  if (classInfo.id === "bonds") {
    if (symbol.includes("TLT") || symbol.includes("IEF") || symbol.includes("GOVT")) {
      return "govt-bonds";
    }
    return "corp-bonds"; // Default for bonds
  }

  // Real estate subclasses
  if (classInfo.id === "real-estate") {
    return "reits"; // Default to REITs
  }

  // Crypto subclasses
  if (classInfo.id === "crypto") {
    if (symbol.includes("BTC") || symbol === "BITCOIN") {
      return "bitcoin";
    }
    return "altcoins";
  }

  return classInfo.subclasses[0]?.id ?? null;
}

// =============================================================================
// HELPER EXPORTS
// =============================================================================

export { MOCK_ASSET_CLASSES };
