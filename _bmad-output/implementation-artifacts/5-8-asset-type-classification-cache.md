# Story 5.8: Asset Type Classification Cache

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want **to cache and maintain standardized asset type classifications (REITs, Stocks, ETFs, etc.) with a localization overlay that accounts for regulatory differences between jurisdictions (SEC/US, CVM/Brazil)**,
so that **the app can correctly classify assets across markets, link equivalent instruments via ISIN, and scale to new countries/regions without database schema changes**.

## Acceptance Criteria

1. **AC-5.8.1: Canonical Asset Type Schema**
   - Given the system needs to classify asset types
   - When the schema is implemented
   - Then canonical (universal) asset types are defined:
     - COMMON_STOCK, PREFERRED_STOCK, ETF, REIT, FIXED_INCOME_FUND, MONEY_MARKET_FUND, COMMODITY_ETF, BOND, DEPOSITARY_RECEIPT, etc.
   - And each canonical type has a unique code, name, and description
   - And the schema is jurisdiction-agnostic (no country-specific fields)

2. **AC-5.8.2: Localization Overlay Table**
   - Given different jurisdictions use different nomenclature
   - When the localization overlay is implemented
   - Then a separate table maps: (canonical_type_id, jurisdiction_code) → local_name, local_code, regulatory_reference
   - And jurisdictions include: "US-SEC", "BR-CVM", with extensibility for others
   - And examples:
     - (COMMON_STOCK, US-SEC) → "Common Stock", "CS", "Rule 144"
     - (COMMON_STOCK, BR-CVM) → "Ação Ordinária", "ON", "Lei 6.404"
     - (REIT, US-SEC) → "Real Estate Investment Trust", "REIT", "IRC Section 856"
     - (REIT, BR-CVM) → "Fundo de Investimento Imobiliário", "FII", "Lei 8.668"

3. **AC-5.8.3: ISIN as Universal Key**
   - Given assets may exist in multiple markets
   - When asset data is fetched or parsed from IR reports
   - Then ISIN (International Securities Identification Number) is stored as the universal identifier
   - And ISIN follows ISO 6166 format (2-letter country + 9 alphanumeric + 1 check digit)
   - And assets with same ISIN are linked as equivalent instruments
   - And local symbols (e.g., "PETR4.SA", "PBR") are stored as jurisdiction-specific aliases

4. **AC-5.8.4: Asset-to-Type Mapping with Jurisdiction**
   - Given an asset symbol needs type classification
   - When the classification is requested
   - Then the system returns:
     - canonicalTypeId, canonicalTypeName
     - jurisdictionCode, localTypeName, localTypeCode
     - isin (if available)
     - confidence score
   - And the result includes lastUpdated timestamp

5. **AC-5.8.5: Multi-Jurisdiction Asset Linking**
   - Given an asset exists in multiple markets (e.g., ADR + original stock)
   - When the asset is queried
   - Then the system returns all linked symbols sharing the same ISIN root
   - And example: ISIN "BRPETRACNOR9" (PETR4) links to ADR with different ISIN but same underlying

6. **AC-5.8.6: Gemini Integration for Asset Type**
   - Given assets are fetched via the Gemini provider
   - When fundamentals data is retrieved
   - Then asset type from Gemini is mapped to canonical type
   - And jurisdiction is inferred from symbol suffix or ISIN country code
   - And unmapped asset types are logged for review

7. **AC-5.8.7: Classification Sync with Overnight Job**
   - Given the overnight job runs
   - When fundamentals are fetched
   - Then asset type classifications are updated
   - And ISIN is extracted and stored if available
   - And classification changes are logged for audit
   - And cache is invalidated/updated for changed assets

8. **AC-5.8.8: Extensible Jurisdiction Support**
   - Given a new jurisdiction needs to be added (e.g., EU-MiFID, UK-FCA)
   - When the configuration is updated
   - Then only data inserts are required (no schema changes)
   - And new localization mappings are added to overlay table
   - And existing functionality continues unchanged

9. **AC-5.8.9: Cache Table Naming Convention**
   - Given tables are created to cache asset type data
   - When the schema is implemented
   - Then all cache tables use the prefix `cached_` (e.g., `cached_asset_types`, `cached_jurisdictions`)
   - And each cache record includes a `cache_updated_at` timestamp column
   - And `cache_updated_at` is automatically set on insert/update
   - And this convention enables easy identification of cacheable vs. transactional data

## Tasks / Subtasks

### Task 1: Canonical Asset Type Schema (AC: 5.8.1, 5.8.9)

- [ ] 1.1: Create `cached_asset_types` table: id (varchar), name, description, category, cache_updated_at
- [ ] 1.2: Define categories: EQUITY, FIXED_INCOME, FUND, COMMODITY, DERIVATIVE
- [ ] 1.3: Seed canonical types:
  - COMMON_STOCK, PREFERRED_STOCK, DEPOSITARY_RECEIPT (ADR/GDR/BDR)
  - ETF, REIT, FIXED_INCOME_FUND, MONEY_MARKET_FUND, COMMODITY_ETF
  - CORPORATE_BOND, GOVERNMENT_BOND, MUNICIPAL_BOND
  - OPTION, FUTURE, WARRANT
- [ ] 1.4: Create Drizzle schema in `src/lib/db/schema/cached-asset-types.ts`
- [ ] 1.5: Add appropriate indexes
- [ ] 1.6: Add trigger or default for cache_updated_at on insert/update

### Task 2: Jurisdiction Registry Table (AC: 5.8.2, 5.8.8, 5.8.9)

- [ ] 2.1: Create `cached_jurisdictions` table: code, name, country_iso, regulatory_body, currency_default, cache_updated_at
- [ ] 2.2: Seed initial jurisdictions:
  - "US-SEC": United States, SEC, USD
  - "BR-CVM": Brazil, CVM, BRL
- [ ] 2.3: Create Drizzle schema in `src/lib/db/schema/cached-jurisdictions.ts`
- [ ] 2.4: Design for extensibility (EU-MiFID, UK-FCA, JP-FSA, etc.)

### Task 3: Localization Overlay Table (AC: 5.8.2, 5.8.9)

- [ ] 3.1: Create `cached_asset_type_localizations` table:
  - canonical_type_id (FK), jurisdiction_code (FK)
  - local_name, local_code, regulatory_reference, notes, cache_updated_at
  - Composite PK: (canonical_type_id, jurisdiction_code)
- [ ] 3.2: Seed US-SEC localizations for all canonical types
- [ ] 3.3: Seed BR-CVM localizations for all canonical types
- [ ] 3.4: Create Drizzle schema in `src/lib/db/schema/cached-asset-type-localizations.ts`

### Task 4: Asset Registry with ISIN (AC: 5.8.3, 5.8.5, 5.8.9)

- [ ] 4.1: Create `cached_asset_identifiers` table:
  - symbol (PK), isin, canonical_type_id, jurisdiction_code
  - local_type_code, confidence, source, cache_updated_at
- [ ] 4.2: Add ISIN validation (ISO 6166 format with check digit)
- [ ] 4.3: Create index on isin for cross-market linking queries
- [ ] 4.4: Create `cached_asset_aliases` table: isin, symbol, jurisdiction_code, is_primary, cache_updated_at
- [ ] 4.5: Add migration with foreign keys

### Task 5: Asset Type Mapping Service (AC: 5.8.6)

- [ ] 5.1: Create `src/lib/services/classification/asset-type-mapping-service.ts`
- [ ] 5.2: Implement `mapGeminiToCanonicalType(assetType: string): CanonicalTypeMapping`
- [ ] 5.3: Implement `inferJurisdiction(symbol: string, isin?: string): JurisdictionCode`
  - Use symbol suffix: ".SA" → BR-CVM, no suffix/".N"/".OQ" → US-SEC
  - Use ISIN country code as fallback: "BR" prefix → BR-CVM
- [ ] 5.4: Build mapping table for common Gemini asset type variations
- [ ] 5.5: Return confidence score based on mapping quality
- [ ] 5.6: Log unmapped asset types with structured logging

### Task 6: ISIN Validation and Parsing (AC: 5.8.3)

- [ ] 6.1: Create `src/lib/utils/isin.ts`
- [ ] 6.2: Implement `validateIsin(isin: string): boolean` with check digit validation
- [ ] 6.3: Implement `parseIsin(isin: string): { countryCode, nsin, checkDigit }`
- [ ] 6.4: Implement `getCountryFromIsin(isin: string): string` (2-letter ISO)
- [ ] 6.5: Add unit tests for ISIN validation (valid, invalid, edge cases)

### Task 7: Asset Type Classification Service (AC: 5.8.4, 5.8.5)

- [ ] 7.1: Create `src/lib/services/classification/asset-type-service.ts`
- [ ] 7.2: Implement `getAssetTypeClassification(symbol: string): Promise<FullTypeClassification>`
- [ ] 7.3: Implement `getLinkedAssets(isin: string): Promise<LinkedAsset[]>`
- [ ] 7.4: Implement `getAssetsByType(canonicalTypeId: string, jurisdiction?: string): Promise<string[]>`
- [ ] 7.5: Implement `getLocalizedTypeName(canonicalTypeId: string, jurisdiction: string): string`
- [ ] 7.6: Add TypeScript interfaces for all classification results

### Task 8: Cache Layer for Asset Types (AC: 5.8.4)

- [ ] 8.1: Create `src/lib/providers/asset-type-cache.ts`
- [ ] 8.2: Implement cache-aside pattern for asset type lookups
- [ ] 8.3: Use cache key pattern: `global:asset-type:{symbol}`
- [ ] 8.4: Use cache key pattern: `global:isin-links:{isin}`
- [ ] 8.5: Set TTL to 7 days (same as fundamentals)

### Task 9: Integration with Overnight Job (AC: 5.8.7)

- [ ] 9.1: Update `src/lib/inngest/functions/overnight-scoring.ts`
- [ ] 9.2: Add asset type classification step after fundamentals fetch
- [ ] 9.3: Extract ISIN from Gemini response if available
- [ ] 9.4: Call `asset-type-mapping-service` for each asset
- [ ] 9.5: Upsert to asset classification tables
- [ ] 9.6: Invalidate cache for updated classifications
- [ ] 9.7: Add metrics: typesClassified, isinsExtracted, unmappedCount

### Task 10: API Endpoints (AC: 5.8.4, 5.8.5)

- [ ] 10.1: Create `src/app/api/asset-types/route.ts` (GET) - list all canonical types
- [ ] 10.2: Create `src/app/api/asset-types/[typeId]/route.ts` (GET) - get type with localizations
- [ ] 10.3: Create `src/app/api/assets/[symbol]/classification/route.ts` (GET) - get asset classification
- [ ] 10.4: Create `src/app/api/assets/linked/route.ts` (GET) - query by ISIN for linked assets
- [ ] 10.5: Use standardized API responses from `@/lib/api/responses.ts`

### Task 11: Seed Scripts (AC: 5.8.1, 5.8.2, 5.8.8)

- [ ] 11.1: Create `scripts/seed-asset-types.ts` with all canonical types
- [ ] 11.2: Create `scripts/seed-jurisdictions.ts` with US-SEC, BR-CVM
- [ ] 11.3: Create `scripts/seed-localizations.ts` with all mappings
- [ ] 11.4: Add npm scripts: `pnpm db:seed-asset-types`
- [ ] 11.5: Ensure all seeds are idempotent

### Task 12: Unit Tests (All AC)

- [ ] 12.1: Test ISIN validation (valid formats, invalid formats, check digit)
- [ ] 12.2: Test asset type mapping service (exact, fuzzy, unmapped)
- [ ] 12.3: Test jurisdiction inference from symbol and ISIN
- [ ] 12.4: Test localization overlay lookups
- [ ] 12.5: Test linked asset queries by ISIN
- [ ] 12.6: Test cache layer (hit, miss, expiry)

### Task 13: Integration Tests (AC: 5.8.6, 5.8.7)

- [ ] 13.1: Test full flow: Gemini data → type mapping → DB storage → cache
- [ ] 13.2: Test overnight job asset type classification step
- [ ] 13.3: Test ISIN-based asset linking across jurisdictions
- [ ] 13.4: Test API endpoints against test database

### Task 14: Documentation (All AC)

- [ ] 14.1: Document canonical asset type definitions
- [ ] 14.2: Document jurisdiction extension process
- [ ] 14.3: Document ISIN format and validation rules
- [ ] 14.4: Add SEC/CVM mapping reference table to docs/

## Dev Notes

### Asset Type Taxonomy

**Canonical Types (Jurisdiction-Agnostic):**

| Category     | Canonical Type     | Description                             |
| ------------ | ------------------ | --------------------------------------- |
| EQUITY       | COMMON_STOCK       | Ordinary shares with voting rights      |
| EQUITY       | PREFERRED_STOCK    | Preferred shares with dividend priority |
| EQUITY       | DEPOSITARY_RECEIPT | ADR, GDR, BDR - foreign stock wrappers  |
| FUND         | ETF                | Exchange-traded fund                    |
| FUND         | REIT               | Real estate investment trust            |
| FUND         | FIXED_INCOME_FUND  | Bond/fixed income fund                  |
| FUND         | MONEY_MARKET_FUND  | Short-term money market fund            |
| FUND         | COMMODITY_ETF      | Commodity-focused ETF                   |
| FIXED_INCOME | CORPORATE_BOND     | Corporate debt security                 |
| FIXED_INCOME | GOVERNMENT_BOND    | Sovereign debt security                 |
| FIXED_INCOME | MUNICIPAL_BOND     | Municipal/local government debt         |
| DERIVATIVE   | OPTION             | Stock option contract                   |
| DERIVATIVE   | FUTURE             | Futures contract                        |
| DERIVATIVE   | WARRANT            | Right to buy stock at fixed price       |

### SEC (US) vs CVM (Brazil) Comparison

| Canonical Type     | US-SEC Name                  | US Code | BR-CVM Name                       | BR Code |
| ------------------ | ---------------------------- | ------- | --------------------------------- | ------- |
| COMMON_STOCK       | Common Stock                 | CS      | Ação Ordinária                    | ON      |
| PREFERRED_STOCK    | Preferred Stock              | PS      | Ação Preferencial                 | PN      |
| DEPOSITARY_RECEIPT | American Depositary Receipt  | ADR     | Brazilian Depositary Receipt      | BDR     |
| ETF                | Exchange-Traded Fund         | ETF     | Fundo de Índice                   | ETF     |
| REIT               | Real Estate Investment Trust | REIT    | Fundo de Investimento Imobiliário | FII     |
| FIXED_INCOME_FUND  | Bond Fund                    | BF      | Fundo de Renda Fixa               | FRF     |

### ISIN Format (ISO 6166)

```
Format: CC-NNNNNNNNN-C
        ││         │
        ││         └── Check digit (Luhn algorithm mod 10)
        │└──────────── 9-character alphanumeric NSIN
        └────────────── 2-letter country code (ISO 3166-1 alpha-2)

Examples:
  US0378331005  - Apple Inc. (US)
  BRPETRACNOR9  - Petrobras ON (Brazil)
  GB0002634946  - BAE Systems (UK)
```

### ISIN Check Digit Validation (Luhn Algorithm)

```typescript
function validateIsinCheckDigit(isin: string): boolean {
  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  const digits = isin
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return (code - 55).toString();
      return char;
    })
    .join("");

  // Apply Luhn algorithm
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}
```

### Database Schema Pattern

All cache tables use the `cached_` prefix per AC-5.8.9:

```typescript
// src/lib/db/schema/cached-asset-types.ts
import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  decimal,
  serial,
  boolean,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";

export const assetCategoryEnum = pgEnum("asset_category", [
  "EQUITY",
  "FIXED_INCOME",
  "FUND",
  "COMMODITY",
  "DERIVATIVE",
]);

export const cachedAssetTypes = pgTable("cached_asset_types", {
  id: varchar("id", { length: 30 }).primaryKey(), // "COMMON_STOCK"
  name: varchar("name", { length: 100 }).notNull(),
  category: assetCategoryEnum("category").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cacheUpdatedAt: timestamp("cache_updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// src/lib/db/schema/cached-jurisdictions.ts
export const cachedJurisdictions = pgTable("cached_jurisdictions", {
  code: varchar("code", { length: 10 }).primaryKey(), // "US-SEC", "BR-CVM"
  name: varchar("name", { length: 100 }).notNull(),
  countryIso: varchar("country_iso", { length: 2 }).notNull(), // "US", "BR"
  regulatoryBody: varchar("regulatory_body", { length: 50 }).notNull(),
  currencyDefault: varchar("currency_default", { length: 3 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cacheUpdatedAt: timestamp("cache_updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// src/lib/db/schema/cached-asset-type-localizations.ts
export const cachedAssetTypeLocalizations = pgTable(
  "cached_asset_type_localizations",
  {
    canonicalTypeId: varchar("canonical_type_id", { length: 30 })
      .notNull()
      .references(() => cachedAssetTypes.id),
    jurisdictionCode: varchar("jurisdiction_code", { length: 10 })
      .notNull()
      .references(() => cachedJurisdictions.code),
    localName: varchar("local_name", { length: 100 }).notNull(),
    localCode: varchar("local_code", { length: 10 }).notNull(),
    regulatoryReference: varchar("regulatory_reference", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.canonicalTypeId, table.jurisdictionCode] }),
  })
);

// src/lib/db/schema/cached-asset-identifiers.ts
export const cachedAssetIdentifiers = pgTable("cached_asset_identifiers", {
  symbol: varchar("symbol", { length: 20 }).primaryKey(),
  isin: varchar("isin", { length: 12 }), // ISO 6166: exactly 12 chars
  canonicalTypeId: varchar("canonical_type_id", { length: 30 })
    .notNull()
    .references(() => cachedAssetTypes.id),
  jurisdictionCode: varchar("jurisdiction_code", { length: 10 })
    .notNull()
    .references(() => cachedJurisdictions.code),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cacheUpdatedAt: timestamp("cache_updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// For linking assets across markets
export const cachedAssetAliases = pgTable(
  "cached_asset_aliases",
  {
    id: serial("id").primaryKey(),
    isin: varchar("isin", { length: 12 }).notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    jurisdictionCode: varchar("jurisdiction_code", { length: 10 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cacheUpdatedAt: timestamp("cache_updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    isinIdx: index("idx_cached_asset_aliases_isin").on(table.isin),
    symbolIdx: index("idx_cached_asset_aliases_symbol").on(table.symbol),
    uniqueSymbol: unique().on(table.symbol, table.jurisdictionCode),
  })
);
```

### Jurisdiction Inference Logic

```typescript
function inferJurisdiction(symbol: string, isin?: string): string {
  // Priority 1: ISIN country code
  if (isin && isin.length >= 2) {
    const countryCode = isin.substring(0, 2);
    if (countryCode === "BR") return "BR-CVM";
    if (countryCode === "US") return "US-SEC";
    // Add more as jurisdictions expand
  }

  // Priority 2: Symbol suffix
  if (symbol.endsWith(".SA")) return "BR-CVM";
  if (symbol.endsWith(".N") || symbol.endsWith(".OQ")) return "US-SEC";
  if (symbol.match(/^\d{1,2}$/)) return "BR-CVM"; // Brazilian suffix pattern

  // Default to US-SEC for international assets
  return "US-SEC";
}
```

### Cache Key Pattern

```typescript
// Asset type cache keys
`global:asset-types` // All canonical types
`global:jurisdictions` // All jurisdictions
`global:localizations:{jurisdiction}` // Localizations for jurisdiction
`global:asset-type:{symbol}` // Single asset classification
`global:isin-links:{isin}` // Assets sharing ISIN
`global:assets-by-type:{typeId}`; // Assets of a type
```

### Gemini Asset Type Mapping Examples

| Gemini Type       | Canonical Type     | Confidence |
| ----------------- | ------------------ | ---------- |
| "Common Stock"    | COMMON_STOCK       | 1.0        |
| "Ordinary Shares" | COMMON_STOCK       | 0.95       |
| "Preferred Stock" | PREFERRED_STOCK    | 1.0        |
| "ADR"             | DEPOSITARY_RECEIPT | 1.0        |
| "ETF"             | ETF                | 1.0        |
| "REIT"            | REIT               | 1.0        |
| "Real Estate"     | REIT               | 0.8        |
| "FII"             | REIT               | 1.0        |
| "Ação ON"         | COMMON_STOCK       | 1.0        |
| "Ação PN"         | PREFERRED_STOCK    | 1.0        |

### Integration with Story 5.7 (GICS)

This story complements Story 5.7:

- **5.7**: Classifies assets by **industry/sector** (GICS)
- **5.8**: Classifies assets by **instrument type** (Equity, Fund, etc.)

Both classifications are independent and can be applied simultaneously to an asset.

### Existing Infrastructure

| Component                  | Location                                               | Relevance                       |
| -------------------------- | ------------------------------------------------------ | ------------------------------- |
| FundamentalsResult type    | `src/lib/providers/types.ts`                           | May need to add assetType field |
| GeminiFundamentalsProvider | `src/lib/providers/implementations/gemini-provider.ts` | Extract asset type              |
| Fundamentals cache         | `src/lib/providers/fundamentals-cache.ts`              | Pattern to follow               |
| Overnight scoring job      | `src/lib/inngest/functions/overnight-scoring.ts`       | Integration point               |
| Story 5.7                  | `5-7-industry-sector-classification-cache.md`          | Related classification          |

### Testing Standards

Per CLAUDE.md:

- Unit tests: `tests/unit/services/classification/asset-type-*.test.ts`
- Unit tests: `tests/unit/utils/isin.test.ts`
- Integration tests: `tests/integration/services/classification/`
- Use vitest with existing mock patterns

### Project Structure Notes

New files to create:

```
src/lib/db/schema/
  ├── asset-types.ts                    # Canonical types
  ├── jurisdictions.ts                  # Jurisdiction registry
  ├── asset-type-localizations.ts       # Localization overlay
  └── asset-identifiers.ts              # Asset-to-type mapping

src/lib/services/classification/
  ├── asset-type-mapping-service.ts     # Gemini → canonical mapping
  ├── asset-type-service.ts             # Main service API
  └── index.ts                          # Updated barrel export

src/lib/utils/isin.ts                   # ISIN validation utilities
src/lib/providers/asset-type-cache.ts   # Vercel KV cache layer

src/app/api/asset-types/
  ├── route.ts                          # List canonical types
  └── [typeId]/route.ts                 # Type details

src/app/api/assets/
  ├── [symbol]/classification/route.ts  # Asset classification
  └── linked/route.ts                   # ISIN-linked assets

scripts/
  ├── seed-asset-types.ts               # Canonical types seed
  ├── seed-jurisdictions.ts             # Jurisdictions seed
  └── seed-localizations.ts             # Localization overlay seed
```

### Future Extensibility

To add a new jurisdiction (e.g., EU-MiFID):

1. Insert into `jurisdictions` table: `{ code: "EU-MIFID", name: "European Union", countryIso: "EU", regulatoryBody: "ESMA", currencyDefault: "EUR" }`
2. Insert localization rows for each canonical type
3. Add jurisdiction inference rules for EU symbol patterns
4. No schema changes required

### References

- [Source: `src/lib/providers/types.ts`] - Provider result interfaces
- [Source: `src/lib/providers/implementations/gemini-provider.ts`] - Gemini integration
- [Source: `_bmad-output/implementation-artifacts/5-7-industry-sector-classification-cache.md`] - Related GICS story
- [Source: `_bmad-output/planning-artifacts/architecture.md`] - Cache patterns, DB conventions
- [Source: `CLAUDE.md#Development Standards`] - Test requirements, PR checklist
- [External: ISO 6166](https://www.iso.org/standard/78502.html) - ISIN standard
- [External: SEC Asset Classes](https://www.sec.gov/) - US regulatory reference
- [External: CVM Classifications](https://www.gov.br/cvm/) - Brazil regulatory reference

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
