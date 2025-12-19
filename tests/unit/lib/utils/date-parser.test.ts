/**
 * Date Parser Utility Tests
 *
 * Tests for centralized date parsing functions used in API responses.
 * @see src/lib/utils/date-parser.ts
 */

import { describe, it, expect } from "vitest";
import {
  isValidDateString,
  isDate,
  parseDate,
  parseDateRequired,
  parseDateWithDefault,
  parseDatesInObject,
  parseDatesInArray,
  parseApiResponse,
  parseApiArrayResponse,
} from "@/lib/utils/date-parser";

// =============================================================================
// TYPE GUARDS
// =============================================================================

describe("isValidDateString", () => {
  it("returns true for valid ISO date strings", () => {
    expect(isValidDateString("2024-01-15T10:30:00.000Z")).toBe(true);
    expect(isValidDateString("2024-01-15")).toBe(true);
    expect(isValidDateString("2024-01-15T10:30:00")).toBe(true);
  });

  it("returns false for invalid date strings", () => {
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("2024-13-45")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isValidDateString(null)).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
    expect(isValidDateString(123)).toBe(false);
    expect(isValidDateString({})).toBe(false);
    expect(isValidDateString(new Date())).toBe(false);
  });
});

describe("isDate", () => {
  it("returns true for valid Date objects", () => {
    expect(isDate(new Date())).toBe(true);
    expect(isDate(new Date("2024-01-15"))).toBe(true);
  });

  it("returns false for invalid Date objects", () => {
    expect(isDate(new Date("invalid"))).toBe(false);
  });

  it("returns false for non-Date values", () => {
    expect(isDate(null)).toBe(false);
    expect(isDate(undefined)).toBe(false);
    expect(isDate("2024-01-15")).toBe(false);
    expect(isDate(1705312200000)).toBe(false);
  });
});

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

describe("parseDate", () => {
  it("parses valid ISO date strings", () => {
    const result = parseDate("2024-01-15T10:30:00.000Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2024-01-15T10:30:00.000Z");
  });

  it("returns the same Date object if already a Date", () => {
    const date = new Date("2024-01-15");
    const result = parseDate(date);
    expect(result).toBe(date);
  });

  it("returns null for null input", () => {
    expect(parseDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it("returns null for invalid date strings", () => {
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("invalid")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });
});

describe("parseDateRequired", () => {
  it("parses valid date strings", () => {
    const result = parseDateRequired("2024-01-15T10:30:00.000Z", "testField");
    expect(result).toBeInstanceOf(Date);
  });

  it("returns the same Date object if already a Date", () => {
    const date = new Date("2024-01-15");
    const result = parseDateRequired(date, "testField");
    expect(result).toBe(date);
  });

  it("throws for null input", () => {
    expect(() => parseDateRequired(null, "testField")).toThrow(
      "Invalid or missing date for field: testField"
    );
  });

  it("throws for undefined input", () => {
    expect(() => parseDateRequired(undefined, "testField")).toThrow(
      "Invalid or missing date for field: testField"
    );
  });

  it("throws for invalid date strings", () => {
    expect(() => parseDateRequired("not-a-date", "createdAt")).toThrow(
      "Invalid or missing date for field: createdAt"
    );
  });

  it("includes field name in error message", () => {
    expect(() => parseDateRequired(null, "updatedAt")).toThrow("updatedAt");
  });
});

describe("parseDateWithDefault", () => {
  it("parses valid date strings", () => {
    const defaultDate = new Date("2020-01-01");
    const result = parseDateWithDefault("2024-01-15T10:30:00.000Z", defaultDate);
    expect(result.toISOString()).toBe("2024-01-15T10:30:00.000Z");
  });

  it("returns default for null input", () => {
    const defaultDate = new Date("2020-01-01");
    const result = parseDateWithDefault(null, defaultDate);
    expect(result).toBe(defaultDate);
  });

  it("returns default for undefined input", () => {
    const defaultDate = new Date("2020-01-01");
    const result = parseDateWithDefault(undefined, defaultDate);
    expect(result).toBe(defaultDate);
  });

  it("returns default for invalid date strings", () => {
    const defaultDate = new Date("2020-01-01");
    const result = parseDateWithDefault("invalid", defaultDate);
    expect(result).toBe(defaultDate);
  });

  it("returns parsed Date for valid Date input", () => {
    const inputDate = new Date("2024-06-15");
    const defaultDate = new Date("2020-01-01");
    const result = parseDateWithDefault(inputDate, defaultDate);
    expect(result).toBe(inputDate);
  });
});

// =============================================================================
// OBJECT TRANSFORMERS
// =============================================================================

describe("parseDatesInObject", () => {
  it("parses default date fields", () => {
    const obj = {
      id: "123",
      name: "Test",
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-16T12:00:00.000Z",
    };

    const result = parseDatesInObject(obj);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.id).toBe("123");
    expect(result.name).toBe("Test");
  });

  it("handles null date values", () => {
    const obj = {
      id: "123",
      createdAt: "2024-01-15T10:30:00.000Z",
      deletedAt: null,
    };

    const result = parseDatesInObject(obj);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.deletedAt).toBeNull();
  });

  it("preserves non-date fields", () => {
    const obj = {
      id: "123",
      count: 42,
      active: true,
      createdAt: "2024-01-15T10:30:00.000Z",
    };

    const result = parseDatesInObject(obj);

    expect(result.id).toBe("123");
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it("uses custom date fields when specified", () => {
    const obj = {
      id: "123",
      customDate: "2024-01-15T10:30:00.000Z",
      createdAt: "2024-01-16T10:30:00.000Z", // Won't be parsed
    };

    const result = parseDatesInObject(obj, ["customDate"]);

    expect(result.customDate).toBeInstanceOf(Date);
    expect(typeof result.createdAt).toBe("string"); // Not parsed
  });

  it("handles objects with no date fields", () => {
    const obj = {
      id: "123",
      name: "Test",
    };

    const result = parseDatesInObject(obj);

    expect(result).toEqual(obj);
  });

  it("does not modify original object", () => {
    const obj = {
      createdAt: "2024-01-15T10:30:00.000Z",
    };

    const result = parseDatesInObject(obj);

    expect(typeof obj.createdAt).toBe("string");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("handles priceUpdatedAt field", () => {
    const obj = {
      priceUpdatedAt: "2024-01-15T10:30:00.000Z",
    };

    const result = parseDatesInObject(obj);
    expect(result.priceUpdatedAt).toBeInstanceOf(Date);
  });

  it("handles dataFreshness field", () => {
    const obj = {
      dataFreshness: "2024-01-15T10:30:00.000Z",
    };

    const result = parseDatesInObject(obj);
    expect(result.dataFreshness).toBeInstanceOf(Date);
  });

  it("skips invalid date strings", () => {
    const obj = {
      createdAt: "not-a-date",
      updatedAt: "2024-01-15T10:30:00.000Z",
    };

    const result = parseDatesInObject(obj);

    expect(result.createdAt).toBe("not-a-date"); // Unchanged
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

describe("parseDatesInArray", () => {
  it("parses dates in all array items", () => {
    const arr = [
      { id: "1", createdAt: "2024-01-15T10:30:00.000Z" },
      { id: "2", createdAt: "2024-01-16T10:30:00.000Z" },
    ];

    const result = parseDatesInArray(arr);

    expect(result[0]?.createdAt).toBeInstanceOf(Date);
    expect(result[1]?.createdAt).toBeInstanceOf(Date);
  });

  it("handles empty arrays", () => {
    const result = parseDatesInArray([]);
    expect(result).toEqual([]);
  });

  it("uses custom date fields", () => {
    const arr = [{ id: "1", customDate: "2024-01-15T10:30:00.000Z" }];

    const result = parseDatesInArray(arr, ["customDate"]);

    expect(result[0]?.customDate).toBeInstanceOf(Date);
  });

  it("does not modify original array", () => {
    const arr = [{ createdAt: "2024-01-15T10:30:00.000Z" }];

    const result = parseDatesInArray(arr);

    expect(typeof arr[0]?.createdAt).toBe("string");
    expect(result[0]?.createdAt).toBeInstanceOf(Date);
  });
});

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

describe("parseApiResponse", () => {
  it("parses dates in response data", () => {
    const response = {
      data: {
        id: "123",
        createdAt: "2024-01-15T10:30:00.000Z",
      },
      success: true,
    };

    const result = parseApiResponse(response);

    expect(result.data.createdAt).toBeInstanceOf(Date);
    expect(result.success).toBe(true);
  });

  it("preserves other response properties", () => {
    const response = {
      data: { id: "123" },
      meta: { page: 1 },
      success: true,
    };

    const result = parseApiResponse(response);

    expect(result.meta).toEqual({ page: 1 });
    expect(result.success).toBe(true);
  });

  it("uses custom date fields", () => {
    const response = {
      data: {
        customDate: "2024-01-15T10:30:00.000Z",
        createdAt: "2024-01-16T10:30:00.000Z",
      },
    };

    const result = parseApiResponse(response, ["customDate"]);

    expect(result.data.customDate).toBeInstanceOf(Date);
    expect(typeof result.data.createdAt).toBe("string");
  });
});

describe("parseApiArrayResponse", () => {
  it("parses dates in array response data", () => {
    const response = {
      data: [
        { id: "1", createdAt: "2024-01-15T10:30:00.000Z" },
        { id: "2", createdAt: "2024-01-16T10:30:00.000Z" },
      ],
      total: 2,
    };

    const result = parseApiArrayResponse(response);

    expect(result.data[0]?.createdAt).toBeInstanceOf(Date);
    expect(result.data[1]?.createdAt).toBeInstanceOf(Date);
    expect(result.total).toBe(2);
  });

  it("handles empty data arrays", () => {
    const response = {
      data: [],
      total: 0,
    };

    const result = parseApiArrayResponse(response);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("uses custom date fields", () => {
    const response = {
      data: [{ customDate: "2024-01-15T10:30:00.000Z" }],
    };

    const result = parseApiArrayResponse(response, ["customDate"]);

    expect(result.data[0]?.customDate).toBeInstanceOf(Date);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge Cases", () => {
  it("handles already-parsed Date objects in objects", () => {
    const existingDate = new Date("2024-01-15");
    const obj = {
      createdAt: existingDate,
    };

    const result = parseDatesInObject(obj);

    // Date objects should be preserved (not string, so won't be re-parsed)
    expect(result.createdAt).toBe(existingDate);
  });

  it("handles mixed date formats in same object", () => {
    const obj = {
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-16",
      timestamp: "2024-01-17T00:00:00Z",
    };

    const result = parseDatesInObject(obj);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it("handles deeply nested structures gracefully", () => {
    const obj = {
      createdAt: "2024-01-15T10:30:00.000Z",
      nested: {
        innerDate: "2024-01-16T10:30:00.000Z", // Won't be parsed (nested)
      },
    };

    const result = parseDatesInObject(obj);

    expect(result.createdAt).toBeInstanceOf(Date);
    // Nested dates are not automatically parsed
    expect(typeof result.nested.innerDate).toBe("string");
  });

  it("handles whitespace in date strings", () => {
    // Date strings with leading/trailing whitespace are not parsed
    // The utility checks isValidDateString which uses new Date() - whitespace causes NaN
    const obj = {
      createdAt: "  2024-01-15T10:30:00.000Z  ",
    };

    const result = parseDatesInObject(obj);

    // Whitespace causes the string to remain unparsed
    expect(typeof result.createdAt).toBe("string");
  });
});
