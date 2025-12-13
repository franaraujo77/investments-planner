/**
 * User Utilities Tests
 *
 * Tests for shared user display utility functions.
 * @see src/lib/utils/user.ts
 */

import { describe, it, expect } from "vitest";
import { getDisplayName, getUserInitials } from "@/lib/utils/user";

describe("getDisplayName", () => {
  it("returns name when available", () => {
    expect(getDisplayName({ name: "John Doe", email: "john@example.com" })).toBe("John Doe");
  });

  it("returns email username when name is null", () => {
    expect(getDisplayName({ name: null, email: "john.doe@example.com" })).toBe("john.doe");
  });

  it("handles simple email usernames", () => {
    expect(getDisplayName({ name: null, email: "admin@test.org" })).toBe("admin");
  });

  it("returns 'User' for email starting with @", () => {
    expect(getDisplayName({ name: null, email: "@example.com" })).toBe("User");
  });

  it("returns 'User' for empty email", () => {
    expect(getDisplayName({ name: null, email: "" })).toBe("User");
  });

  it("returns 'User' for email without @ symbol", () => {
    // Edge case: malformed email without @
    expect(getDisplayName({ name: null, email: "noemail" })).toBe("noemail");
  });

  it("handles email with multiple @ symbols", () => {
    // Takes part before first @
    expect(getDisplayName({ name: null, email: "user@test@example.com" })).toBe("user");
  });

  it("trims whitespace from name", () => {
    expect(getDisplayName({ name: "  John Doe  ", email: "john@example.com" })).toBe(
      "  John Doe  "
    );
  });
});

describe("getUserInitials", () => {
  it("returns two-letter initials for full names", () => {
    expect(getUserInitials({ name: "John Doe", email: "john@example.com" })).toBe("JD");
    expect(getUserInitials({ name: "Jane Smith", email: "jane@example.com" })).toBe("JS");
  });

  it("returns first two letters for single names", () => {
    expect(getUserInitials({ name: "Admin", email: "admin@example.com" })).toBe("AD");
    expect(getUserInitials({ name: "Bob", email: "bob@example.com" })).toBe("BO");
  });

  it("uses email username for null names", () => {
    expect(getUserInitials({ name: null, email: "testuser@example.com" })).toBe("TE");
    expect(getUserInitials({ name: null, email: "ab@example.com" })).toBe("AB");
  });

  it("handles multi-word names", () => {
    expect(getUserInitials({ name: "Jean-Luc Picard", email: "captain@enterprise.com" })).toBe(
      "JP"
    );
  });

  it("returns uppercase initials", () => {
    expect(getUserInitials({ name: "john doe", email: "john@example.com" })).toBe("JD");
  });

  it("handles names with extra whitespace", () => {
    expect(getUserInitials({ name: "John   Doe", email: "john@example.com" })).toBe("JD");
  });

  it("returns fallback for edge cases", () => {
    // Empty email with null name should return "??"
    expect(getUserInitials({ name: null, email: "" })).toBe("??");
    // Email starting with @ should return "??"
    expect(getUserInitials({ name: null, email: "@example.com" })).toBe("??");
  });

  it("handles single character names", () => {
    expect(getUserInitials({ name: "A", email: "a@example.com" })).toBe("A?");
  });

  it("handles three or more word names", () => {
    expect(getUserInitials({ name: "John Paul Jones", email: "jpj@example.com" })).toBe("JP");
  });
});
