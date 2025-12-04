/**
 * Portfolio Types (Shared / Client-Safe)
 *
 * Type definitions that can be safely imported by both server and client components.
 * These types mirror the service layer types but without importing server-only modules.
 *
 * IMPORTANT: This file must NOT import any server-only modules like:
 * - portfolio-service
 * - db/index
 * - Any module that uses 'postgres'
 */

/**
 * Portfolio base type
 */
export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Portfolio asset (raw database record)
 */
export interface PortfolioAsset {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string | null;
  quantity: string;
  purchasePrice: string;
  currency: string;
  assetClassId: string | null;
  subclassId: string | null;
  isIgnored: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Asset with calculated value data
 */
export interface AssetWithValue {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string | null;
  quantity: string;
  purchasePrice: string;
  currency: string;
  isIgnored: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** Current price (from API or fallback to purchase price) */
  currentPrice: string;
  /** Value in native currency (quantity * currentPrice) */
  valueNative: string;
  /** Value in base currency (valueNative * exchangeRate) */
  valueBase: string;
  /** Exchange rate from native to base currency */
  exchangeRate: string;
  /** Allocation percentage of total portfolio */
  allocationPercent: string;
  /** When price was last updated */
  priceUpdatedAt: Date;
}

/**
 * Portfolio with all calculated values
 */
export interface PortfolioWithValues {
  portfolio: Portfolio;
  assets: AssetWithValue[];
  /** Total value of all assets in base currency */
  totalValueBase: string;
  /** Total value of active (non-ignored) assets */
  totalActiveValueBase: string;
  /** User's base currency */
  baseCurrency: string;
  /** Oldest data freshness timestamp */
  dataFreshness: Date;
  /** Total number of assets */
  assetCount: number;
  /** Number of active (non-ignored) assets */
  activeAssetCount: number;
  /** Number of ignored assets */
  ignoredAssetCount: number;
}
