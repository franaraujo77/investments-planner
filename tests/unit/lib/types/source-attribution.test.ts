/**
 * Source Attribution Types and Utilities Tests
 *
 * Story 6.8: Data Source Attribution
 * AC-6.8.1: Provider Name Displayed for Each Data Point
 * AC-6.8.2: Source Format String Display
 *
 * Tests for source attribution types and utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  getProviderDisplayName,
  formatSourceAttribution,
  createSourceAttribution,
  isValidSource,
  getSourceOrDefault,
  PROVIDER_DISPLAY_NAMES,
  DATA_TYPE_LABELS,
  type SourceDataType,
} from "@/lib/types/source-attribution";

// =============================================================================
// getProviderDisplayName Tests
// =============================================================================

describe("getProviderDisplayName", () => {
  /**
   * AC-6.8.1: Provider name is human-readable (not technical API names)
   */
  describe("known providers", () => {
    it("should map 'gemini' to 'Gemini API'", () => {
      expect(getProviderDisplayName("gemini")).toBe("Gemini API");
    });

    it("should map 'yahoo' to 'Yahoo Finance'", () => {
      expect(getProviderDisplayName("yahoo")).toBe("Yahoo Finance");
    });

    it("should map 'exchangerate-api' to 'ExchangeRate-API'", () => {
      expect(getProviderDisplayName("exchangerate-api")).toBe("ExchangeRate-API");
    });

    it("should map 'open-exchange-rates' to 'Open Exchange Rates'", () => {
      expect(getProviderDisplayName("open-exchange-rates")).toBe("Open Exchange Rates");
    });

    it("should handle already display names", () => {
      expect(getProviderDisplayName("Gemini API")).toBe("Gemini API");
      expect(getProviderDisplayName("Yahoo Finance")).toBe("Yahoo Finance");
    });

    it("should map 'manual' to 'Manual Entry' (Story 7.1)", () => {
      expect(getProviderDisplayName("manual")).toBe("Manual Entry");
    });
  });

  describe("unknown providers", () => {
    it("should return the source as-is for unknown providers", () => {
      expect(getProviderDisplayName("unknown-provider")).toBe("unknown-provider");
      expect(getProviderDisplayName("some-new-api")).toBe("some-new-api");
    });
  });

  describe("edge cases", () => {
    it("should return 'Unknown' for empty string", () => {
      expect(getProviderDisplayName("")).toBe("Unknown");
    });

    it("should return 'Unknown' for whitespace-only string", () => {
      // Empty string check happens before any trimming
      expect(getProviderDisplayName("")).toBe("Unknown");
    });
  });
});

// =============================================================================
// formatSourceAttribution Tests
// =============================================================================

describe("formatSourceAttribution", () => {
  /**
   * AC-6.8.2: Format follows the pattern "Price from Gemini API"
   */
  describe("price data type", () => {
    it("should format 'Price from Gemini API' correctly", () => {
      expect(formatSourceAttribution("price", "gemini")).toBe("Price from Gemini API");
    });

    it("should format with already-display provider name", () => {
      expect(formatSourceAttribution("price", "Gemini API")).toBe("Price from Gemini API");
    });
  });

  describe("rate data type", () => {
    it("should format 'Rate from ExchangeRate-API' correctly", () => {
      expect(formatSourceAttribution("rate", "exchangerate-api")).toBe(
        "Rate from ExchangeRate-API"
      );
    });

    it("should format 'Rate from Open Exchange Rates' correctly", () => {
      expect(formatSourceAttribution("rate", "open-exchange-rates")).toBe(
        "Rate from Open Exchange Rates"
      );
    });
  });

  describe("fundamentals data type", () => {
    it("should format 'Fundamentals from Gemini API' correctly", () => {
      expect(formatSourceAttribution("fundamentals", "gemini")).toBe(
        "Fundamentals from Gemini API"
      );
    });

    it("should format 'Fundamentals from Yahoo Finance' correctly", () => {
      expect(formatSourceAttribution("fundamentals", "yahoo")).toBe(
        "Fundamentals from Yahoo Finance"
      );
    });
  });

  describe("score data type", () => {
    it("should format score attribution correctly", () => {
      expect(formatSourceAttribution("score", "local")).toBe("Score from local");
    });
  });

  describe("unknown data type", () => {
    it("should use 'Data' as fallback for unknown types", () => {
      expect(formatSourceAttribution("unknown" as SourceDataType, "gemini")).toBe(
        "Data from Gemini API"
      );
    });
  });

  describe("unknown provider", () => {
    it("should use provider name as-is for unknown providers", () => {
      expect(formatSourceAttribution("price", "new-provider")).toBe("Price from new-provider");
    });
  });
});

// =============================================================================
// createSourceAttribution Tests
// =============================================================================

describe("createSourceAttribution", () => {
  it("should create SourceAttribution object with display name", () => {
    const attribution = createSourceAttribution("price", "gemini");

    expect(attribution.dataType).toBe("price");
    expect(attribution.source).toBe("Gemini API");
    expect(attribution.timestamp).toBeUndefined();
  });

  it("should include timestamp when provided", () => {
    const timestamp = new Date("2025-12-10T12:00:00Z");
    const attribution = createSourceAttribution("rate", "exchangerate-api", timestamp);

    expect(attribution.dataType).toBe("rate");
    expect(attribution.source).toBe("ExchangeRate-API");
    expect(attribution.timestamp).toEqual(timestamp);
  });
});

// =============================================================================
// isValidSource Tests
// =============================================================================

describe("isValidSource", () => {
  /**
   * AC-6.8.4: Source is never null or empty for fetched data
   */
  it("should return true for valid source strings", () => {
    expect(isValidSource("gemini")).toBe(true);
    expect(isValidSource("Gemini API")).toBe(true);
    expect(isValidSource("some-provider")).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidSource(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidSource(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidSource("")).toBe(false);
  });

  it("should return false for whitespace-only string", () => {
    expect(isValidSource("   ")).toBe(false);
  });
});

// =============================================================================
// getSourceOrDefault Tests
// =============================================================================

describe("getSourceOrDefault", () => {
  it("should return display name for valid source", () => {
    expect(getSourceOrDefault("gemini")).toBe("Gemini API");
    expect(getSourceOrDefault("yahoo")).toBe("Yahoo Finance");
  });

  it("should return 'Unknown' for null", () => {
    expect(getSourceOrDefault(null)).toBe("Unknown");
  });

  it("should return 'Unknown' for undefined", () => {
    expect(getSourceOrDefault(undefined)).toBe("Unknown");
  });

  it("should return 'Unknown' for empty string", () => {
    expect(getSourceOrDefault("")).toBe("Unknown");
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe("PROVIDER_DISPLAY_NAMES", () => {
  it("should contain all expected provider mappings", () => {
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("gemini");
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("yahoo");
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("exchangerate-api");
    expect(PROVIDER_DISPLAY_NAMES).toHaveProperty("open-exchange-rates");
  });
});

describe("DATA_TYPE_LABELS", () => {
  it("should contain all data type labels", () => {
    expect(DATA_TYPE_LABELS.price).toBe("Price");
    expect(DATA_TYPE_LABELS.rate).toBe("Rate");
    expect(DATA_TYPE_LABELS.fundamentals).toBe("Fundamentals");
    expect(DATA_TYPE_LABELS.score).toBe("Score");
  });
});

// =============================================================================
// NEW TESTS - Document Reference Types (Story 7.1)
// =============================================================================

import {
  getDocumentTypeLabel,
  formatDocumentAttribution,
  DOCUMENT_TYPE_LABELS,
  type DocumentReference,
  type DocumentType,
} from "@/lib/types/source-attribution";

describe("getDocumentTypeLabel", () => {
  /**
   * Story 7.1, AC-7.1.3: Investor Relations Document Attribution
   */
  it("should return label for earnings report", () => {
    expect(getDocumentTypeLabel("earnings")).toBe("Earnings Report");
  });

  it("should return label for annual report", () => {
    expect(getDocumentTypeLabel("annual-report")).toBe("Annual Report");
  });

  it("should return label for filing", () => {
    expect(getDocumentTypeLabel("filing")).toBe("Filing");
  });

  it("should return label for press release", () => {
    expect(getDocumentTypeLabel("press-release")).toBe("Press Release");
  });

  it("should return label for IR presentation", () => {
    expect(getDocumentTypeLabel("ir-presentation")).toBe("IR Presentation");
  });

  it("should return 'Document' for unknown type", () => {
    expect(getDocumentTypeLabel("unknown" as DocumentType)).toBe("Document");
  });
});

describe("formatDocumentAttribution", () => {
  /**
   * Story 7.1, AC-7.1.3: Investor Relations Document Attribution
   * AC-7.1.5: Independent Verification Support
   */
  it("should format document attribution with title and publication date", () => {
    const doc: DocumentReference = {
      title: "Q3 2024 Earnings Report",
      type: "earnings",
      publicationDate: new Date("2024-10-15"),
    };

    const result = formatDocumentAttribution(doc);
    expect(result).toContain("Q3 2024 Earnings Report");
    expect(result).toContain("Earnings Report");
    expect(result).toContain("Oct");
    expect(result).toContain("2024");
  });

  it("should format annual report document", () => {
    const doc: DocumentReference = {
      title: "2023 Annual Report",
      type: "annual-report",
      publicationDate: new Date("2024-03-01"),
    };

    const result = formatDocumentAttribution(doc);
    expect(result).toContain("2023 Annual Report");
    expect(result).toContain("Annual Report");
  });

  it("should include filing ID when present", () => {
    const doc: DocumentReference = {
      title: "Form 10-K",
      type: "filing",
      publicationDate: new Date("2024-02-28"),
      filingId: "0001234567-24-000001",
    };

    const result = formatDocumentAttribution(doc);
    expect(result).toContain("Form 10-K");
    expect(result).toContain("0001234567-24-000001");
  });

  it("should handle document without optional fields", () => {
    const doc: DocumentReference = {
      title: "Investor Update",
      type: "press-release",
      publicationDate: new Date("2024-11-01"),
    };

    const result = formatDocumentAttribution(doc);
    expect(result).toContain("Investor Update");
    expect(result).toContain("Press Release");
  });
});

describe("DocumentReference type", () => {
  /**
   * Story 7.1, AC-7.1.3, AC-7.1.5: Type structure validation
   */
  it("should accept valid document reference object", () => {
    const doc: DocumentReference = {
      title: "Q3 2024 Earnings Report",
      type: "earnings",
      publicationDate: new Date("2024-10-15"),
      url: "https://ir.company.com/earnings/q3-2024",
      filingId: "SEC-12345",
    };

    expect(doc.title).toBe("Q3 2024 Earnings Report");
    expect(doc.type).toBe("earnings");
    expect(doc.publicationDate).toBeInstanceOf(Date);
    expect(doc.url).toBe("https://ir.company.com/earnings/q3-2024");
    expect(doc.filingId).toBe("SEC-12345");
  });

  it("should allow document without optional url and filingId", () => {
    const doc: DocumentReference = {
      title: "Investor Presentation",
      type: "ir-presentation",
      publicationDate: new Date("2024-09-01"),
    };

    expect(doc.title).toBe("Investor Presentation");
    expect(doc.url).toBeUndefined();
    expect(doc.filingId).toBeUndefined();
  });
});

describe("SourceAttribution with documentRef", () => {
  /**
   * Story 7.1: Extended SourceAttribution with document reference support
   */
  it("should accept source attribution with document reference", () => {
    const attribution = createSourceAttribution(
      "fundamentals",
      "company-ir",
      new Date("2024-10-20")
    );
    // Type assertion to check extended interface compatibility
    const extendedAttribution =
      attribution as import("@/lib/types/source-attribution").SourceAttribution & {
        documentRef?: DocumentReference;
      };
    extendedAttribution.documentRef = {
      title: "Q3 2024 Earnings Report",
      type: "earnings",
      publicationDate: new Date("2024-10-15"),
      url: "https://ir.company.com/earnings/q3-2024",
    };

    expect(extendedAttribution.dataType).toBe("fundamentals");
    expect(extendedAttribution.documentRef?.title).toBe("Q3 2024 Earnings Report");
  });

  it("should work without document reference (backwards compatible)", () => {
    const attribution = createSourceAttribution("price", "gemini", new Date());

    expect(attribution.documentRef).toBeUndefined();
  });
});

describe("PROVIDER_DISPLAY_NAMES - IR Providers", () => {
  /**
   * Story 7.1: Additional IR document providers
   */
  it("should include IR document providers", () => {
    expect(PROVIDER_DISPLAY_NAMES["company-ir"]).toBe("Company Investor Relations");
    expect(PROVIDER_DISPLAY_NAMES["sec-filing"]).toBe("SEC Filing");
    expect(PROVIDER_DISPLAY_NAMES["cvm-filing"]).toBe("CVM Filing (Brazil)");
    expect(PROVIDER_DISPLAY_NAMES["b3-filing"]).toBe("B3 Filing");
  });

  it("should map IR providers via getProviderDisplayName", () => {
    expect(getProviderDisplayName("company-ir")).toBe("Company Investor Relations");
    expect(getProviderDisplayName("sec-filing")).toBe("SEC Filing");
    expect(getProviderDisplayName("cvm-filing")).toBe("CVM Filing (Brazil)");
    expect(getProviderDisplayName("b3-filing")).toBe("B3 Filing");
  });
});

describe("DOCUMENT_TYPE_LABELS constant", () => {
  /**
   * Story 7.1, AC-7.1.3: Document type label mapping
   */
  it("should have labels for all document types", () => {
    expect(DOCUMENT_TYPE_LABELS["earnings"]).toBe("Earnings Report");
    expect(DOCUMENT_TYPE_LABELS["annual-report"]).toBe("Annual Report");
    expect(DOCUMENT_TYPE_LABELS["filing"]).toBe("Filing");
    expect(DOCUMENT_TYPE_LABELS["press-release"]).toBe("Press Release");
    expect(DOCUMENT_TYPE_LABELS["ir-presentation"]).toBe("IR Presentation");
  });
});
