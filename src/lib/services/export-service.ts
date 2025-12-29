/**
 * Export Service
 *
 * Business logic for user data export operations.
 * Story 2.7: Data Export
 * Story 1.6: GDPR Compliance - AC-1.6.2 (complete data export)
 *
 * Generates a ZIP file containing:
 * - profile.json (user's profile and preferences)
 * - portfolio.json (user's portfolio holdings)
 * - criteria.json (user's scoring criteria)
 * - history.json (user's investment history)
 * - README.txt (data format documentation)
 */

import archiver from "archiver";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Export schema version for forward compatibility
 * AC-2.7.4: Includes schema version for future compatibility
 */
export const EXPORT_SCHEMA_VERSION = "1.0.0";

/**
 * Export data types
 */
export interface ExportData {
  profile: ProfileExport;
  portfolio: PortfolioExport[];
  criteria: CriteriaExport[];
  history: InvestmentHistoryExport[];
  exportedAt: string;
  schemaVersion: string;
}

/**
 * Profile export data
 * Story 1.6: GDPR Compliance - AC-1.6.2
 */
export interface ProfileExport {
  email: string;
  name: string | null;
  baseCurrency: string;
  locale: string;
  defaultContribution: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  disclaimerAcknowledgedAt: string | null;
  createdAt: string | null;
}

export interface PortfolioExport {
  id: string;
  name: string;
  baseCurrency: string;
  assets: AssetExport[];
  createdAt: string;
}

export interface AssetExport {
  symbol: string;
  quantity: string;
  purchasePrice: string;
  currency: string;
}

export interface CriteriaExport {
  id: string;
  name: string;
  market: string;
  rules: unknown[];
  createdAt: string;
}

export interface InvestmentHistoryExport {
  id: string;
  date: string;
  assetId: string;
  amount: string;
  currency: string;
}

/**
 * Generates README.txt content for the export ZIP
 *
 * AC-2.7.2: README.txt (data format documentation)
 * AC-2.7.4: Includes schema version for future compatibility
 * Story 1.6: GDPR Compliance - Updated to include profile
 *
 * @param exportDate - ISO date string of export
 * @returns README content as string
 */
export function generateReadme(exportDate: string): string {
  return `Investments Planner - Data Export
=================================
Exported: ${exportDate}
Schema Version: ${EXPORT_SCHEMA_VERSION}

Files Included:
- profile.json: Your account profile and preferences
- portfolio.json: Your portfolio holdings and asset values
- criteria.json: Your scoring criteria configurations
- history.json: Your investment history records

Data Format:
All JSON files use ISO 8601 date formats and numeric strings
for monetary values to preserve precision.

GDPR Compliance:
This export contains all personal data we store about you.
For questions or re-import assistance, contact support.
`;
}

/**
 * Fetches profile data for a user
 *
 * Story 1.6: GDPR Compliance - AC-1.6.2
 *
 * @param userId - User ID to fetch profile for
 * @returns Profile export data
 * @throws Error if user not found
 */
export async function getProfileData(userId: string): Promise<ProfileExport> {
  const [user] = await db
    .select({
      email: users.email,
      name: users.name,
      baseCurrency: users.baseCurrency,
      locale: users.locale,
      defaultContribution: users.defaultContribution,
      emailVerified: users.emailVerified,
      emailVerifiedAt: users.emailVerifiedAt,
      disclaimerAcknowledgedAt: users.disclaimerAcknowledgedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    email: user.email,
    name: user.name,
    baseCurrency: user.baseCurrency,
    locale: user.locale,
    defaultContribution: user.defaultContribution,
    emailVerified: user.emailVerified ?? false,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    disclaimerAcknowledgedAt: user.disclaimerAcknowledgedAt?.toISOString() ?? null,
    createdAt: user.createdAt?.toISOString() ?? null,
  };
}

/**
 * Fetches portfolio data for a user
 *
 * Note: Portfolio tables not yet implemented (Epic 3).
 * Returns empty array as placeholder.
 *
 * @param _userId - User ID to fetch portfolios for
 * @returns Array of portfolio exports (empty until Epic 3)
 */
export async function getPortfolioData(_userId: string): Promise<PortfolioExport[]> {
  // TODO: Implement when Epic 3 (Portfolio Core) is complete
  // const portfolios = await db.query.portfolios.findMany({
  //   where: eq(portfolios.userId, userId),
  //   with: { assets: true }
  // });
  // return portfolios.map(formatPortfolio);

  return [];
}

/**
 * Fetches scoring criteria data for a user
 *
 * Note: Criteria tables not yet implemented (Epic 5).
 * Returns empty array as placeholder.
 *
 * @param _userId - User ID to fetch criteria for
 * @returns Array of criteria exports (empty until Epic 5)
 */
export async function getCriteriaData(_userId: string): Promise<CriteriaExport[]> {
  // TODO: Implement when Epic 5 (Scoring Engine) is complete
  // const criteria = await db.query.criteriaVersions.findMany({
  //   where: eq(criteriaVersions.userId, userId)
  // });
  // return criteria.map(formatCriteria);

  return [];
}

/**
 * Fetches investment history for a user
 *
 * Note: Investment history tables not yet implemented (Story 3.8).
 * Returns empty array as placeholder.
 *
 * @param _userId - User ID to fetch history for
 * @returns Array of investment history exports (empty until Story 3.8)
 */
export async function getHistoryData(_userId: string): Promise<InvestmentHistoryExport[]> {
  // TODO: Implement when Story 3.8 (Record Investment Amount) is complete
  // const history = await db.query.investments.findMany({
  //   where: eq(investments.userId, userId)
  // });
  // return history.map(formatHistory);

  return [];
}

/**
 * Creates a ZIP archive buffer from export data
 *
 * AC-2.7.2: ZIP contains profile.json, portfolio.json, criteria.json, history.json, README.txt
 * AC-2.7.4: Data is formatted/indented JSON (human-readable)
 * Story 1.6: GDPR Compliance - includes profile.json
 *
 * @param data - Export data to archive
 * @returns Promise resolving to ZIP buffer
 */
export async function createZipArchive(data: ExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", (err) => reject(err));

    // Add files with formatted JSON (2 space indent for human readability)
    archive.append(JSON.stringify(data.profile, null, 2), {
      name: "profile.json",
    });
    archive.append(JSON.stringify(data.portfolio, null, 2), {
      name: "portfolio.json",
    });
    archive.append(JSON.stringify(data.criteria, null, 2), {
      name: "criteria.json",
    });
    archive.append(JSON.stringify(data.history, null, 2), {
      name: "history.json",
    });
    archive.append(generateReadme(data.exportedAt), { name: "README.txt" });

    archive.finalize();
  });
}

/**
 * Main export function - generates complete user data export as ZIP buffer
 *
 * Story 2.7: Data Export
 * Story 1.6: GDPR Compliance - AC-1.6.2 (complete data export)
 * AC-2.7.2: ZIP file downloads containing all user data
 * AC-2.7.3: Export completes within 30 seconds
 * AC-2.7.4: Human-readable JSON with schema version
 *
 * @param userId - User ID to export data for
 * @returns Promise resolving to ZIP file buffer
 * @throws Error if export generation fails
 */
export async function generateUserExport(userId: string): Promise<Buffer> {
  // Fetch all user data in parallel
  const [profile, portfolio, criteria, history] = await Promise.all([
    getProfileData(userId),
    getPortfolioData(userId),
    getCriteriaData(userId),
    getHistoryData(userId),
  ]);

  // Build export data structure
  const exportData: ExportData = {
    profile,
    portfolio,
    criteria,
    history,
    exportedAt: new Date().toISOString(),
    schemaVersion: EXPORT_SCHEMA_VERSION,
  };

  // Create and return ZIP archive
  return createZipArchive(exportData);
}

// =============================================================================
// CSV EXPORT FOR INVESTMENT HISTORY
// Story 3.9: Investment History View
// AC-3.9.4: CSV Export Functionality
//
// NOTE: CSV export functions are in @/lib/services/csv-export.ts
// This keeps them client-safe (no Node.js dependencies like 'archiver')
// Do NOT import csv-export here as it would create a circular or polluted dependency.
// Client code should import directly from @/lib/services/csv-export
// =============================================================================
