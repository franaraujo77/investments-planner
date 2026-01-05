/**
 * Source Attribution Zod Schemas Tests
 *
 * Story 7.1: Data Source Attribution
 * Task 7.4: Zod Schemas for Source Attribution
 *
 * Tests for source attribution validation schemas.
 */

import { describe, it, expect } from "vitest";
import {
  DocumentTypeSchema,
  DocumentReferenceSchema,
  SourceDataTypeSchema,
  SourceAttributionSchema,
  DataSourceInfoSchema,
  InputSourcesSchema,
  FreshnessInfoSchema,
  parseSourceAttribution,
  parseInputSources,
  parseFreshnessInfo,
} from "@/lib/validations/source-attribution-schemas";

// =============================================================================
// DOCUMENT TYPE SCHEMA TESTS
// =============================================================================

describe("DocumentTypeSchema", () => {
  it("should validate valid document types", () => {
    const validTypes = ["earnings", "annual-report", "filing", "press-release", "ir-presentation"];

    validTypes.forEach((type) => {
      const result = DocumentTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid document types", () => {
    const result = DocumentTypeSchema.safeParse("invalid-type");
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// DOCUMENT REFERENCE SCHEMA TESTS
// =============================================================================

describe("DocumentReferenceSchema", () => {
  it("should validate complete document reference", () => {
    const docRef = {
      title: "Q3 2024 Earnings Report",
      type: "earnings",
      publicationDate: "2024-10-15T00:00:00Z",
      url: "https://ir.company.com/earnings",
      filingId: "10-Q-2024-00123",
    };

    const result = DocumentReferenceSchema.safeParse(docRef);
    expect(result.success).toBe(true);
  });

  it("should validate minimal document reference", () => {
    const docRef = {
      title: "Annual Report 2023",
      type: "annual-report",
      publicationDate: "2024-03-15T00:00:00Z",
    };

    const result = DocumentReferenceSchema.safeParse(docRef);
    expect(result.success).toBe(true);
  });

  it("should accept Date object for publicationDate", () => {
    const docRef = {
      title: "Press Release",
      type: "press-release",
      publicationDate: new Date("2024-10-15"),
    };

    const result = DocumentReferenceSchema.safeParse(docRef);
    expect(result.success).toBe(true);
  });

  it("should reject invalid URL format", () => {
    const docRef = {
      title: "Test Doc",
      type: "filing",
      publicationDate: "2024-10-15T00:00:00Z",
      url: "not-a-valid-url",
    };

    const result = DocumentReferenceSchema.safeParse(docRef);
    expect(result.success).toBe(false);
  });

  it("should reject empty title", () => {
    const docRef = {
      title: "",
      type: "earnings",
      publicationDate: "2024-10-15T00:00:00Z",
    };

    const result = DocumentReferenceSchema.safeParse(docRef);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SOURCE DATA TYPE SCHEMA TESTS
// =============================================================================

describe("SourceDataTypeSchema", () => {
  it("should validate valid data types", () => {
    const validTypes = ["price", "rate", "fundamentals", "score"];

    validTypes.forEach((type) => {
      const result = SourceDataTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid data types", () => {
    const result = SourceDataTypeSchema.safeParse("invalid");
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SOURCE ATTRIBUTION SCHEMA TESTS
// =============================================================================

describe("SourceAttributionSchema", () => {
  it("should validate complete source attribution", () => {
    const attribution = {
      dataType: "price",
      source: "gemini",
      timestamp: "2025-12-31T10:00:00Z",
      documentRef: {
        title: "Test Doc",
        type: "earnings",
        publicationDate: "2024-10-15T00:00:00Z",
      },
    };

    const result = SourceAttributionSchema.safeParse(attribution);
    expect(result.success).toBe(true);
  });

  it("should validate minimal source attribution", () => {
    const attribution = {
      dataType: "price",
      source: "gemini",
    };

    const result = SourceAttributionSchema.safeParse(attribution);
    expect(result.success).toBe(true);
  });

  it("should reject empty source", () => {
    const attribution = {
      dataType: "price",
      source: "",
    };

    const result = SourceAttributionSchema.safeParse(attribution);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// DATA SOURCE INFO SCHEMA TESTS
// =============================================================================

describe("DataSourceInfoSchema", () => {
  it("should validate complete data source info", () => {
    const info = {
      label: "Current Price",
      value: "28.45",
      currency: "BRL",
      source: "gemini",
      fetchedAt: "2025-12-31T10:00:00Z",
    };

    const result = DataSourceInfoSchema.safeParse(info);
    expect(result.success).toBe(true);
  });

  it("should validate without optional currency", () => {
    const info = {
      label: "P/E Ratio",
      value: "12.5",
      source: "gemini",
      fetchedAt: "2025-12-31T10:00:00Z",
    };

    const result = DataSourceInfoSchema.safeParse(info);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// INPUT SOURCES SCHEMA TESTS
// =============================================================================

describe("InputSourcesSchema", () => {
  it("should validate complete input sources", () => {
    const sources = {
      price: {
        label: "Current Price",
        value: "28.45",
        currency: "BRL",
        source: "gemini",
        fetchedAt: "2025-12-31T10:00:00Z",
      },
      exchangeRate: {
        label: "BRL/USD",
        value: "5.02",
        source: "exchangerate-api",
        fetchedAt: "2025-12-31T09:00:00Z",
      },
      fundamentals: {
        label: "P/E Ratio",
        value: "12.5",
        source: "gemini",
        fetchedAt: "2025-12-30T10:00:00Z",
      },
    };

    const result = InputSourcesSchema.safeParse(sources);
    expect(result.success).toBe(true);
  });

  it("should validate empty input sources", () => {
    const result = InputSourcesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate partial input sources", () => {
    const sources = {
      price: {
        label: "Current Price",
        value: "28.45",
        currency: "BRL",
        source: "gemini",
        fetchedAt: "2025-12-31T10:00:00Z",
      },
    };

    const result = InputSourcesSchema.safeParse(sources);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// FRESHNESS INFO SCHEMA TESTS
// =============================================================================

describe("FreshnessInfoSchema", () => {
  it("should validate complete freshness info", () => {
    const info = {
      source: "gemini",
      fetchedAt: "2025-12-31T10:00:00Z",
      isStale: false,
      staleSince: "2025-12-30T10:00:00Z",
    };

    const result = FreshnessInfoSchema.safeParse(info);
    expect(result.success).toBe(true);
  });

  it("should validate minimal freshness info", () => {
    const info = {
      source: "gemini",
      fetchedAt: "2025-12-31T10:00:00Z",
      isStale: false,
    };

    const result = FreshnessInfoSchema.safeParse(info);
    expect(result.success).toBe(true);
  });

  it("should accept Date object for fetchedAt", () => {
    const info = {
      source: "gemini",
      fetchedAt: new Date(),
      isStale: false,
    };

    const result = FreshnessInfoSchema.safeParse(info);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("parseSourceAttribution", () => {
  it("should return valid attribution when input is valid", () => {
    const input = {
      dataType: "price",
      source: "gemini",
      timestamp: "2025-12-31T10:00:00Z",
    };

    const result = parseSourceAttribution(input);
    expect(result).not.toBeNull();
    expect(result?.dataType).toBe("price");
    expect(result?.source).toBe("gemini");
  });

  it("should return null when input is invalid", () => {
    const input = {
      dataType: "invalid",
      source: "",
    };

    const result = parseSourceAttribution(input);
    expect(result).toBeNull();
  });
});

describe("parseInputSources", () => {
  it("should return valid input sources when input is valid", () => {
    const input = {
      price: {
        label: "Price",
        value: "28.45",
        source: "gemini",
        fetchedAt: "2025-12-31T10:00:00Z",
      },
    };

    const result = parseInputSources(input);
    expect(result).not.toBeNull();
    expect(result?.price?.value).toBe("28.45");
  });

  it("should return null when input is invalid", () => {
    const input = {
      price: {
        label: "Price",
        // Missing required fields
      },
    };

    const result = parseInputSources(input);
    expect(result).toBeNull();
  });
});

describe("parseFreshnessInfo", () => {
  it("should return valid freshness info when input is valid", () => {
    const input = {
      source: "gemini",
      fetchedAt: "2025-12-31T10:00:00Z",
      isStale: false,
    };

    const result = parseFreshnessInfo(input);
    expect(result).not.toBeNull();
    expect(result?.source).toBe("gemini");
    expect(result?.isStale).toBe(false);
  });

  it("should return null when input is invalid", () => {
    const input = {
      source: "gemini",
      // Missing fetchedAt and isStale
    };

    const result = parseFreshnessInfo(input);
    expect(result).toBeNull();
  });
});
