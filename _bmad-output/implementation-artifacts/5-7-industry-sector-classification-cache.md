# Story 5.7: Industry/Sector Classification Cache

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want **to cache and maintain standardized industry/sector classifications using GICS (Global Industry Classification Standard) with a three-tier hierarchical key system**,
so that **users can filter assets broadly (all Tech) or granularly (only SaaS companies) and the app aligns with institutional IR reporting standards**.

## Acceptance Criteria

1. **AC-5.7.1: GICS Classification Schema**
   - Given the system needs to classify assets
   - When the classification schema is implemented
   - Then the system uses GICS (Global Industry Classification Standard) three-tier hierarchy:
     - SectorID (2-digit): e.g., 45 for Information Technology
     - IndustryGroupID (4-digit): e.g., 4510 for Software & Services
     - IndustryID (6-digit): e.g., 451030 for Software
   - And all 11 GICS Sectors, 25 Industry Groups, and 74 Industries are defined

2. **AC-5.7.2: Classification Data from Gemini**
   - Given assets are fetched via the Gemini provider
   - When fundamentals data is retrieved
   - Then sector and industry strings from Gemini are mapped to GICS codes
   - And unmapped classifications are logged for review
   - And mapping uses fuzzy matching for common variations

3. **AC-5.7.3: Classification Cache Structure**
   - Given industry classification data is stored
   - When the cache is populated
   - Then data is stored in PostgreSQL as source of truth
   - And Vercel KV cache provides fast lookups (< 50ms)
   - And cache follows key pattern: `global:gics:{level}:{id}` (e.g., `global:gics:sector:45`)

4. **AC-5.7.4: Asset-to-Classification Mapping**
   - Given an asset symbol needs classification
   - When the classification is requested
   - Then the system returns: sectorId, sectorName, industryGroupId, industryGroupName, industryId, industryName
   - And the result includes confidence score for the mapping
   - And the result includes lastUpdated timestamp

5. **AC-5.7.5: Multi-Level Filtering API**
   - Given a user wants to filter assets
   - When they specify a classification level
   - Then they can filter by:
     - Sector only (e.g., "show me all Tech" → sectorId=45)
     - Industry Group (e.g., "show me Software & Services" → industryGroupId=4510)
     - Industry (e.g., "show me only Software companies" → industryId=451030)
   - And queries are optimized with appropriate indexes

6. **AC-5.7.6: Classification Sync with Overnight Job**
   - Given the overnight job runs
   - When fundamentals are fetched
   - Then asset classifications are updated from Gemini data
   - And classification changes are logged for audit
   - And cache is invalidated/updated for changed assets

7. **AC-5.7.7: Reference Data Seed**
   - Given the system initializes
   - When GICS reference data is needed
   - Then a seed script populates all GICS sectors, industry groups, and industries
   - And the seed is idempotent (can run multiple times safely)
   - And includes Brazilian B3-specific mappings where applicable

8. **AC-5.7.8: Cache Table Naming Convention**
   - Given tables are created to cache classification data
   - When the schema is implemented
   - Then all cache tables use the prefix `cached_` (e.g., `cached_gics_sectors`, `cached_asset_classifications`)
   - And each cache record includes a `cache_updated_at` timestamp column
   - And `cache_updated_at` is automatically set on insert/update
   - And this convention enables easy identification of cacheable vs. transactional data

## Tasks / Subtasks

### Task 1: GICS Reference Data Schema (AC: 5.7.1, 5.7.7, 5.7.8)

- [ ] 1.1: Create `cached_gics_sectors` table: id (char 2), name, description, cache_updated_at
- [ ] 1.2: Create `cached_gics_industry_groups` table: id (char 4), sector_id (FK), name, description, cache_updated_at
- [ ] 1.3: Create `cached_gics_industries` table: id (char 6), industry_group_id (FK), name, description, cache_updated_at
- [ ] 1.4: Create seed script with all 11 Sectors, 25 Industry Groups, 74 Industries
- [ ] 1.5: Add migration with appropriate indexes on all ID columns
- [ ] 1.6: Create Drizzle schema types in `src/lib/db/schema/cached-gics.ts`
- [ ] 1.7: Add trigger or default for cache_updated_at on insert/update

### Task 2: Asset Classification Mapping Table (AC: 5.7.4, 5.7.8)

- [ ] 2.1: Create `cached_asset_classifications` table: symbol, gics_industry_id, confidence, source, cache_updated_at
- [ ] 2.2: Add foreign key constraint to `cached_gics_industries`
- [ ] 2.3: Add unique constraint on symbol
- [ ] 2.4: Add index on gics_industry_id for filtering queries
- [ ] 2.5: Create Drizzle schema in `src/lib/db/schema/cached-asset-classifications.ts`

### Task 3: GICS Mapping Service (AC: 5.7.2)

- [ ] 3.1: Create `src/lib/services/classification/gics-mapping-service.ts`
- [ ] 3.2: Implement `mapGeminiToGics(sector: string, industry: string): GicsMapping`
- [ ] 3.3: Build fuzzy matching lookup table for common Gemini sector/industry variations
- [ ] 3.4: Return confidence score (1.0 = exact match, 0.8 = fuzzy match, 0.5 = sector-only match)
- [ ] 3.5: Log unmapped classifications with structured logging
- [ ] 3.6: Add Brazilian market mappings (B3 sectors to GICS)

### Task 4: Classification Cache Layer (AC: 5.7.3)

- [ ] 4.1: Create `src/lib/providers/classification-cache.ts`
- [ ] 4.2: Implement `getClassification(symbol: string): Promise<AssetClassification>`
- [ ] 4.3: Implement `setClassification(symbol: string, classification: AssetClassification)`
- [ ] 4.4: Use cache key pattern: `global:gics:asset:{symbol}`
- [ ] 4.5: Set TTL to 7 days (same as fundamentals)
- [ ] 4.6: Implement cache-aside pattern (check cache → fetch from DB → populate cache)

### Task 5: Classification Service (AC: 5.7.4, 5.7.5)

- [ ] 5.1: Create `src/lib/services/classification/classification-service.ts`
- [ ] 5.2: Implement `getAssetClassification(symbol: string): Promise<FullClassification>`
- [ ] 5.3: Implement `getAssetsBySector(sectorId: string): Promise<string[]>`
- [ ] 5.4: Implement `getAssetsByIndustryGroup(industryGroupId: string): Promise<string[]>`
- [ ] 5.5: Implement `getAssetsByIndustry(industryId: string): Promise<string[]>`
- [ ] 5.6: Add TypeScript interfaces for classification results

### Task 6: Integration with Overnight Job (AC: 5.7.6)

- [ ] 6.1: Update `src/lib/inngest/functions/overnight-scoring.ts`
- [ ] 6.2: Add classification sync step after fundamentals fetch
- [ ] 6.3: For each asset with sector/industry from Gemini, call `gics-mapping-service`
- [ ] 6.4: Upsert to `asset_classifications` table
- [ ] 6.5: Invalidate cache for updated classifications
- [ ] 6.6: Add metrics: classificationsUpdated, unmappedCount

### Task 7: API Endpoint for Classification Queries (AC: 5.7.5)

- [ ] 7.1: Create `src/app/api/classifications/route.ts` (GET)
- [ ] 7.2: Query params: `?sectorId=45` or `?industryGroupId=4510` or `?industryId=451030`
- [ ] 7.3: Return list of asset symbols matching the filter
- [ ] 7.4: Add pagination support (limit, offset)
- [ ] 7.5: Use standardized API responses from `@/lib/api/responses.ts`

### Task 8: Unit Tests (All AC)

- [ ] 8.1: Test GICS mapping service with exact matches
- [ ] 8.2: Test GICS mapping service with fuzzy matches
- [ ] 8.3: Test GICS mapping service with unmapped inputs
- [ ] 8.4: Test classification cache layer (hit, miss, expiry)
- [ ] 8.5: Test classification service filtering queries
- [ ] 8.6: Test API endpoint with various filter combinations

### Task 9: Integration Tests (AC: 5.7.3, 5.7.6)

- [ ] 9.1: Test full flow: Gemini data → mapping → DB storage → cache
- [ ] 9.2: Test overnight job classification sync step
- [ ] 9.3: Test cache invalidation on classification update
- [ ] 9.4: Test API endpoint against test database

### Task 10: Documentation and Seed Data (AC: 5.7.7)

- [ ] 10.1: Create `scripts/seed-gics.ts` with full GICS hierarchy
- [ ] 10.2: Add npm script: `pnpm db:seed-gics`
- [ ] 10.3: Document GICS code structure in README or docs/
- [ ] 10.4: Add common Gemini-to-GICS mappings documentation

## Dev Notes

### GICS Standard Reference

The **Global Industry Classification Standard (GICS)** is the gold standard used by S&P, MSCI, and institutional investors worldwide. Structure:

| Level          | Digits | Count | Example                         |
| -------------- | ------ | ----- | ------------------------------- |
| Sector         | 2      | 11    | 45 = Information Technology     |
| Industry Group | 4      | 25    | 4510 = Software & Services      |
| Industry       | 6      | 74    | 451030 = Software               |
| Sub-Industry   | 8      | 163   | 45103010 = Application Software |

**Note:** This story implements 3 tiers (Sector → Industry Group → Industry). Sub-Industry (8-digit) is optional for future enhancement.

### GICS Sectors (11 Total)

```
10 - Energy
15 - Materials
20 - Industrials
25 - Consumer Discretionary
30 - Consumer Staples
35 - Health Care
40 - Financials
45 - Information Technology
50 - Communication Services
55 - Utilities
60 - Real Estate
```

### Existing Infrastructure

Per Story 5.1 and existing codebase:

| Component                  | Location                                               | Relevance                                  |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| FundamentalsResult type    | `src/lib/providers/types.ts:74-101`                    | Already has `sector` and `industry` fields |
| GeminiFundamentalsProvider | `src/lib/providers/implementations/gemini-provider.ts` | Extracts sector/industry from Gemini API   |
| Fundamentals cache         | `src/lib/providers/fundamentals-cache.ts`              | Pattern to follow for classification cache |
| Overnight scoring job      | `src/lib/inngest/functions/overnight-scoring.ts`       | Integration point for classification sync  |

### Database Schema Pattern

Follow existing Drizzle patterns with `cached_` prefix per AC-5.7.8:

```typescript
// src/lib/db/schema/cached-gics.ts
import { pgTable, char, varchar, text, timestamp, decimal } from "drizzle-orm/pg-core";

export const cachedGicsSectors = pgTable("cached_gics_sectors", {
  id: char("id", { length: 2 }).primaryKey(), // "45"
  name: varchar("name", { length: 100 }).notNull(), // "Information Technology"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cacheUpdatedAt: timestamp("cache_updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const cachedGicsIndustryGroups = pgTable("cached_gics_industry_groups", {
  id: char("id", { length: 4 }).primaryKey(), // "4510"
  sectorId: char("sector_id", { length: 2 })
    .notNull()
    .references(() => cachedGicsSectors.id),
  name: varchar("name", { length: 100 }).notNull(), // "Software & Services"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cacheUpdatedAt: timestamp("cache_updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const cachedGicsIndustries = pgTable("cached_gics_industries", {
  id: char("id", { length: 6 }).primaryKey(), // "451030"
  industryGroupId: char("industry_group_id", { length: 4 })
    .notNull()
    .references(() => cachedGicsIndustryGroups.id),
  name: varchar("name", { length: 100 }).notNull(), // "Software"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cacheUpdatedAt: timestamp("cache_updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const cachedAssetClassifications = pgTable("cached_asset_classifications", {
  symbol: varchar("symbol", { length: 20 }).primaryKey(),
  gicsIndustryId: char("gics_industry_id", { length: 6 })
    .notNull()
    .references(() => cachedGicsIndustries.id),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(), // 0.00 to 1.00
  source: varchar("source", { length: 50 }).notNull(), // "gemini-api", "manual"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cacheUpdatedAt: timestamp("cache_updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
```

### Cache Key Pattern

Per architecture document cache conventions:

```typescript
// Classification cache keys
`global:gics:sectors` // All sectors (reference data)
`global:gics:industry-groups` // All industry groups
`global:gics:industries` // All industries
`global:gics:asset:{symbol}` // Single asset classification
`global:gics:sector:{id}:assets` // Assets in sector
`global:gics:industry:{id}:assets`; // Assets in industry
```

### Gemini-to-GICS Mapping Examples

Common mappings that need to be handled:

| Gemini Sector     | Gemini Industry   | GICS Industry ID | GICS Name                   |
| ----------------- | ----------------- | ---------------- | --------------------------- |
| "Technology"      | "Software"        | 451030           | Software                    |
| "Financials"      | "Banks"           | 401010           | Banks                       |
| "Consumer"        | "Retail"          | 255030           | Multiline Retail            |
| "Healthcare"      | "Pharmaceuticals" | 352010           | Pharmaceuticals             |
| "Energia" (BR)    | "Petróleo"        | 101020           | Oil, Gas & Consumable Fuels |
| "Financeiro" (BR) | "Bancos"          | 401010           | Banks                       |

### Brazilian Market (B3) Considerations

B3 uses Portuguese sector names. Common mappings:

| B3 Sector (PT)                  | GICS Sector                 |
| ------------------------------- | --------------------------- |
| Bens Industriais                | Industrials (20)            |
| Consumo Cíclico                 | Consumer Discretionary (25) |
| Consumo não Cíclico             | Consumer Staples (30)       |
| Financeiro                      | Financials (40)             |
| Materiais Básicos               | Materials (15)              |
| Petróleo, Gás e Biocombustíveis | Energy (10)                 |
| Saúde                           | Health Care (35)            |
| Tecnologia da Informação        | Information Technology (45) |
| Telecomunicações                | Communication Services (50) |
| Utilidade Pública               | Utilities (55)              |

### Testing Standards

Per CLAUDE.md:

- Unit tests: `tests/unit/services/classification/`
- Integration tests: `tests/integration/services/classification/`
- Use vitest with existing mock patterns
- All financial precision with Decimal.js (confidence scores)

### Project Structure Notes

New files to create:

```
src/lib/db/schema/gics.ts                           # GICS table schemas
src/lib/db/schema/asset-classifications.ts          # Asset mapping schema
src/lib/services/classification/
  ├── gics-mapping-service.ts                       # Gemini → GICS mapping
  ├── classification-service.ts                     # Main service API
  └── index.ts                                      # Barrel export
src/lib/providers/classification-cache.ts           # Vercel KV cache layer
src/app/api/classifications/route.ts                # REST API endpoint
scripts/seed-gics.ts                                # GICS reference data seed
```

### Integration with Existing Story 5.1

This story builds on Story 5.1 (Market Data Fetching):

- 5.1 fetches fundamentals including `sector` and `industry` from Gemini
- 5.7 takes those raw strings and maps them to standardized GICS codes
- Integration point is in the overnight job after fundamentals fetch step

### References

- [Source: `src/lib/providers/types.ts:74-101`] - FundamentalsResult with sector/industry fields
- [Source: `src/lib/providers/implementations/gemini-provider.ts:303-308`] - Sector/industry extraction
- [Source: `_bmad-output/planning-artifacts/architecture.md`] - Cache key patterns, database conventions
- [Source: `CLAUDE.md#Development Standards`] - Test requirements, PR checklist
- [External: GICS Structure](https://www.msci.com/our-solutions/indexes/gics) - Official GICS documentation

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
