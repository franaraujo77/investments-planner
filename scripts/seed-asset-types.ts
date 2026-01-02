#!/usr/bin/env npx tsx
/**
 * Asset Type Classification Seed Script
 *
 * Story 5.8: Asset Type Classification Cache
 * AC-5.8.1: Canonical Asset Type Schema
 * AC-5.8.2: Localization Overlay Table
 * AC-5.8.8: Extensible Jurisdiction Support
 *
 * Seeds the following reference data:
 * 1. Canonical asset types (jurisdiction-agnostic)
 * 2. Jurisdictions (regulatory bodies)
 * 3. Localizations (jurisdiction-specific asset type names)
 *
 * Usage: pnpm db:seed-asset-types
 *
 * @module scripts/seed-asset-types
 */

import { db } from "../src/lib/db";
import {
  cachedAssetTypes,
  cachedJurisdictions,
  cachedAssetTypeLocalizations,
} from "../src/lib/db/schema";

// =============================================================================
// CANONICAL ASSET TYPES
// =============================================================================

/**
 * Canonical asset types aligned with schema CANONICAL_ASSET_TYPES
 * These must match the types defined in src/lib/db/schema.ts
 */
const CANONICAL_ASSET_TYPES = [
  // EQUITY category
  {
    id: "COMMON_STOCK",
    name: "Common Stock",
    category: "EQUITY",
    description: "Ordinary shares representing ownership in a corporation",
  },
  {
    id: "PREFERRED_STOCK",
    name: "Preferred Stock",
    category: "EQUITY",
    description: "Shares with preferential dividend rights and priority in liquidation",
  },
  {
    id: "DEPOSITARY_RECEIPT",
    name: "Depositary Receipt",
    category: "EQUITY",
    description: "Certificate representing shares of a foreign company (ADR/GDR/BDR)",
  },

  // FUND category
  {
    id: "ETF",
    name: "Exchange-Traded Fund",
    category: "FUND",
    description: "Fund that trades on exchange and tracks an index, commodity, or basket",
  },
  {
    id: "REIT",
    name: "Real Estate Investment Trust",
    category: "FUND",
    description: "Company that owns or finances income-producing real estate",
  },
  {
    id: "FIXED_INCOME_FUND",
    name: "Fixed Income Fund",
    category: "FUND",
    description: "Investment fund focused on bonds and fixed income securities",
  },
  {
    id: "MONEY_MARKET_FUND",
    name: "Money Market Fund",
    category: "FUND",
    description: "Fund investing in short-term, high-quality debt securities",
  },
  {
    id: "COMMODITY_ETF",
    name: "Commodity ETF",
    category: "FUND",
    description: "Exchange-traded fund that tracks commodity prices",
  },

  // FIXED_INCOME category
  {
    id: "CORPORATE_BOND",
    name: "Corporate Bond",
    category: "FIXED_INCOME",
    description: "Debt security issued by a corporation",
  },
  {
    id: "GOVERNMENT_BOND",
    name: "Government Bond",
    category: "FIXED_INCOME",
    description: "Debt security issued by a national government",
  },
  {
    id: "MUNICIPAL_BOND",
    name: "Municipal Bond",
    category: "FIXED_INCOME",
    description: "Debt security issued by a state, city, or county",
  },

  // DERIVATIVE category
  {
    id: "OPTION",
    name: "Option",
    category: "DERIVATIVE",
    description: "Contract giving right to buy/sell at predetermined price",
  },
  {
    id: "FUTURE",
    name: "Futures Contract",
    category: "DERIVATIVE",
    description: "Standardized contract to buy/sell at future date and price",
  },
  {
    id: "WARRANT",
    name: "Warrant",
    category: "DERIVATIVE",
    description: "Long-term option issued by company to buy shares",
  },
];

// =============================================================================
// JURISDICTIONS
// =============================================================================

/**
 * Regulatory jurisdictions with ISO country codes.
 */
const JURISDICTIONS = [
  {
    code: "US-SEC",
    name: "United States",
    countryIso: "US",
    regulatoryBody: "SEC",
    currencyDefault: "USD",
  },
  {
    code: "BR-CVM",
    name: "Brazil",
    countryIso: "BR",
    regulatoryBody: "CVM",
    currencyDefault: "BRL",
  },
  {
    code: "UK-FCA",
    name: "United Kingdom",
    countryIso: "GB",
    regulatoryBody: "FCA",
    currencyDefault: "GBP",
  },
  {
    code: "EU-MIFID",
    name: "European Union",
    countryIso: "EU",
    regulatoryBody: "MiFID II",
    currencyDefault: "EUR",
  },
  {
    code: "CA-CSA",
    name: "Canada",
    countryIso: "CA",
    regulatoryBody: "CSA",
    currencyDefault: "CAD",
  },
  {
    code: "JP-FSA",
    name: "Japan",
    countryIso: "JP",
    regulatoryBody: "FSA",
    currencyDefault: "JPY",
  },
  {
    code: "AU-ASIC",
    name: "Australia",
    countryIso: "AU",
    regulatoryBody: "ASIC",
    currencyDefault: "AUD",
  },
  {
    code: "CH-FINMA",
    name: "Switzerland",
    countryIso: "CH",
    regulatoryBody: "FINMA",
    currencyDefault: "CHF",
  },
];

// =============================================================================
// LOCALIZATIONS
// =============================================================================

/**
 * Jurisdiction-specific asset type names.
 * Maps canonical types to local nomenclature.
 * Only includes types that exist in CANONICAL_ASSET_TYPES above.
 */
const LOCALIZATIONS: Array<{
  canonicalTypeId: string;
  jurisdictionCode: string;
  localName: string;
  localCode: string;
  regulatoryReference?: string;
}> = [
  // Brazilian localizations (CVM nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "BR-CVM",
    localName: "Ação Ordinária",
    localCode: "ON",
    regulatoryReference: "Lei 6.404/76",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "BR-CVM",
    localName: "Ação Preferencial",
    localCode: "PN",
    regulatoryReference: "Lei 6.404/76",
  },
  {
    canonicalTypeId: "DEPOSITARY_RECEIPT",
    jurisdictionCode: "BR-CVM",
    localName: "BDR (Brazilian Depositary Receipt)",
    localCode: "BDR",
    regulatoryReference: "IN CVM 332",
  },
  {
    canonicalTypeId: "REIT",
    jurisdictionCode: "BR-CVM",
    localName: "Fundo de Investimento Imobiliário",
    localCode: "FII",
    regulatoryReference: "Lei 8.668/93",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "BR-CVM",
    localName: "ETF (Fundo de Índice)",
    localCode: "ETF",
    regulatoryReference: "IN CVM 359",
  },
  {
    canonicalTypeId: "FIXED_INCOME_FUND",
    jurisdictionCode: "BR-CVM",
    localName: "Fundo de Renda Fixa",
    localCode: "FRF",
    regulatoryReference: "IN CVM 555",
  },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "BR-CVM",
    localName: "Título Público Federal",
    localCode: "TPF",
    regulatoryReference: "Lei 10.179/01",
  },
  {
    canonicalTypeId: "CORPORATE_BOND",
    jurisdictionCode: "BR-CVM",
    localName: "Debênture",
    localCode: "DEB",
    regulatoryReference: "Lei 6.404/76",
  },

  // US localizations (SEC nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "US-SEC",
    localName: "Common Stock",
    localCode: "CS",
    regulatoryReference: "Securities Act 1933",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "US-SEC",
    localName: "Preferred Stock",
    localCode: "PFD",
    regulatoryReference: "Securities Act 1933",
  },
  {
    canonicalTypeId: "DEPOSITARY_RECEIPT",
    jurisdictionCode: "US-SEC",
    localName: "American Depositary Receipt",
    localCode: "ADR",
    regulatoryReference: "Securities Act 1933",
  },
  {
    canonicalTypeId: "REIT",
    jurisdictionCode: "US-SEC",
    localName: "Real Estate Investment Trust",
    localCode: "REIT",
    regulatoryReference: "IRC Section 856",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "US-SEC",
    localName: "Exchange-Traded Fund",
    localCode: "ETF",
    regulatoryReference: "Investment Company Act 1940",
  },
  {
    canonicalTypeId: "FIXED_INCOME_FUND",
    jurisdictionCode: "US-SEC",
    localName: "Bond Fund",
    localCode: "BF",
    regulatoryReference: "Investment Company Act 1940",
  },
  {
    canonicalTypeId: "MONEY_MARKET_FUND",
    jurisdictionCode: "US-SEC",
    localName: "Money Market Fund",
    localCode: "MMF",
    regulatoryReference: "Investment Company Act 1940",
  },
  {
    canonicalTypeId: "COMMODITY_ETF",
    jurisdictionCode: "US-SEC",
    localName: "Commodity ETF",
    localCode: "CETF",
    regulatoryReference: "Investment Company Act 1940",
  },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "US-SEC",
    localName: "Treasury Bond",
    localCode: "T-BOND",
  },
  {
    canonicalTypeId: "CORPORATE_BOND",
    jurisdictionCode: "US-SEC",
    localName: "Corporate Bond",
    localCode: "CORP",
  },
  {
    canonicalTypeId: "MUNICIPAL_BOND",
    jurisdictionCode: "US-SEC",
    localName: "Municipal Bond",
    localCode: "MUNI",
  },
  { canonicalTypeId: "OPTION", jurisdictionCode: "US-SEC", localName: "Option", localCode: "OPT" },
  {
    canonicalTypeId: "FUTURE",
    jurisdictionCode: "US-SEC",
    localName: "Futures Contract",
    localCode: "FUT",
  },
  {
    canonicalTypeId: "WARRANT",
    jurisdictionCode: "US-SEC",
    localName: "Warrant",
    localCode: "WRT",
  },

  // UK localizations (FCA nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "UK-FCA",
    localName: "Ordinary Shares",
    localCode: "ORD",
    regulatoryReference: "Companies Act 2006",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "UK-FCA",
    localName: "Preference Shares",
    localCode: "PREF",
    regulatoryReference: "Companies Act 2006",
  },
  {
    canonicalTypeId: "DEPOSITARY_RECEIPT",
    jurisdictionCode: "UK-FCA",
    localName: "Global Depositary Receipt",
    localCode: "GDR",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "UK-FCA",
    localName: "Exchange-Traded Fund",
    localCode: "ETF",
  },
  {
    canonicalTypeId: "REIT",
    jurisdictionCode: "UK-FCA",
    localName: "Real Estate Investment Trust",
    localCode: "REIT",
    regulatoryReference: "Finance Act 2006",
  },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "UK-FCA",
    localName: "Gilt",
    localCode: "GILT",
  },
  {
    canonicalTypeId: "CORPORATE_BOND",
    jurisdictionCode: "UK-FCA",
    localName: "Corporate Bond",
    localCode: "CORP",
  },

  // EU localizations (MiFID nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "EU-MIFID",
    localName: "Ordinary Shares",
    localCode: "SHR",
    regulatoryReference: "MiFID II",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "EU-MIFID",
    localName: "Preference Shares",
    localCode: "PREF",
    regulatoryReference: "MiFID II",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "EU-MIFID",
    localName: "UCITS ETF",
    localCode: "UCITS",
    regulatoryReference: "UCITS Directive",
  },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "EU-MIFID",
    localName: "Sovereign Bond",
    localCode: "GOV",
  },
  {
    canonicalTypeId: "CORPORATE_BOND",
    jurisdictionCode: "EU-MIFID",
    localName: "Corporate Bond",
    localCode: "CORP",
  },

  // Canada localizations (CSA nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "CA-CSA",
    localName: "Common Shares",
    localCode: "COM",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "CA-CSA",
    localName: "Preferred Shares",
    localCode: "PR",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "CA-CSA",
    localName: "Exchange-Traded Fund",
    localCode: "ETF",
  },
  {
    canonicalTypeId: "REIT",
    jurisdictionCode: "CA-CSA",
    localName: "Real Estate Investment Trust",
    localCode: "REIT",
  },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "CA-CSA",
    localName: "Government of Canada Bond",
    localCode: "GCAN",
  },

  // Japan localizations (FSA nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "JP-FSA",
    localName: "普通株式 (Common Stock)",
    localCode: "普通",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "JP-FSA",
    localName: "優先株式 (Preferred Stock)",
    localCode: "優先",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "JP-FSA",
    localName: "上場投資信託",
    localCode: "ETF",
  },
  { canonicalTypeId: "REIT", jurisdictionCode: "JP-FSA", localName: "J-REIT", localCode: "REIT" },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "JP-FSA",
    localName: "Japanese Government Bond",
    localCode: "JGB",
  },

  // Australia localizations (ASIC nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "AU-ASIC",
    localName: "Ordinary Shares",
    localCode: "ORD",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "AU-ASIC",
    localName: "Preference Shares",
    localCode: "PREF",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "AU-ASIC",
    localName: "Exchange-Traded Fund",
    localCode: "ETF",
  },
  { canonicalTypeId: "REIT", jurisdictionCode: "AU-ASIC", localName: "A-REIT", localCode: "REIT" },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "AU-ASIC",
    localName: "Australian Government Bond",
    localCode: "AGB",
  },

  // Switzerland localizations (FINMA nomenclature)
  {
    canonicalTypeId: "COMMON_STOCK",
    jurisdictionCode: "CH-FINMA",
    localName: "Stammaktien",
    localCode: "ST",
  },
  {
    canonicalTypeId: "PREFERRED_STOCK",
    jurisdictionCode: "CH-FINMA",
    localName: "Vorzugsaktien",
    localCode: "VZ",
  },
  {
    canonicalTypeId: "ETF",
    jurisdictionCode: "CH-FINMA",
    localName: "Exchange-Traded Fund",
    localCode: "ETF",
  },
  {
    canonicalTypeId: "GOVERNMENT_BOND",
    jurisdictionCode: "CH-FINMA",
    localName: "Eidgenossenschaft",
    localCode: "CONF",
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function seedAssetTypeClassification() {
  console.log("🌱 Seeding asset type classification reference data...\n");

  try {
    // Step 1: Seed canonical asset types
    console.log("📊 Seeding canonical asset types...");
    for (const assetType of CANONICAL_ASSET_TYPES) {
      await db
        .insert(cachedAssetTypes)
        .values({
          id: assetType.id,
          name: assetType.name,
          category: assetType.category,
          description: assetType.description,
        })
        .onConflictDoUpdate({
          target: cachedAssetTypes.id,
          set: {
            name: assetType.name,
            category: assetType.category,
            description: assetType.description,
            cacheUpdatedAt: new Date(),
          },
        });
    }
    console.log(`   ✅ Seeded ${CANONICAL_ASSET_TYPES.length} canonical asset types\n`);

    // Step 2: Seed jurisdictions
    console.log("🌍 Seeding jurisdictions...");
    for (const jurisdiction of JURISDICTIONS) {
      await db
        .insert(cachedJurisdictions)
        .values({
          code: jurisdiction.code,
          name: jurisdiction.name,
          countryIso: jurisdiction.countryIso,
          regulatoryBody: jurisdiction.regulatoryBody,
          currencyDefault: jurisdiction.currencyDefault,
        })
        .onConflictDoUpdate({
          target: cachedJurisdictions.code,
          set: {
            name: jurisdiction.name,
            countryIso: jurisdiction.countryIso,
            regulatoryBody: jurisdiction.regulatoryBody,
            currencyDefault: jurisdiction.currencyDefault,
            cacheUpdatedAt: new Date(),
          },
        });
    }
    console.log(`   ✅ Seeded ${JURISDICTIONS.length} jurisdictions\n`);

    // Step 3: Seed localizations
    console.log("🏷️  Seeding localizations...");
    for (const localization of LOCALIZATIONS) {
      await db
        .insert(cachedAssetTypeLocalizations)
        .values({
          canonicalTypeId: localization.canonicalTypeId,
          jurisdictionCode: localization.jurisdictionCode,
          localName: localization.localName,
          localCode: localization.localCode,
          regulatoryReference: localization.regulatoryReference ?? null,
        })
        .onConflictDoUpdate({
          target: [
            cachedAssetTypeLocalizations.canonicalTypeId,
            cachedAssetTypeLocalizations.jurisdictionCode,
          ],
          set: {
            localName: localization.localName,
            localCode: localization.localCode,
            regulatoryReference: localization.regulatoryReference ?? null,
            cacheUpdatedAt: new Date(),
          },
        });
    }
    console.log(`   ✅ Seeded ${LOCALIZATIONS.length} localizations\n`);

    console.log("🎉 Asset type classification seeding complete!");
    console.log("\nSummary:");
    console.log(`   - ${CANONICAL_ASSET_TYPES.length} canonical asset types`);
    console.log(`   - ${JURISDICTIONS.length} jurisdictions`);
    console.log(`   - ${LOCALIZATIONS.length} localizations`);
  } catch (error) {
    console.error("❌ Failed to seed asset type classification:", error);
    process.exit(1);
  }
}

// Run the seed
seedAssetTypeClassification()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
