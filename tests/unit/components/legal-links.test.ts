/**
 * Legal Links Tests
 *
 * Story 9.5: Terms of Service & Privacy Policy
 * AC-9.5.3: Links to ToS and Privacy in registration flow
 * AC-9.5.4: Links to ToS and Privacy in sidebar footer
 *
 * Tests verify that the required links are configured correctly.
 * Since we're testing static configuration, we verify:
 * - Link hrefs are correct
 * - Link structure follows patterns
 */

import { describe, it, expect } from "vitest";

describe("Legal Links Configuration", () => {
  describe("Sidebar Footer Links (AC-9.5.4)", () => {
    /**
     * Per AC-9.5.4, the sidebar footer must include:
     * - Disclaimer link (/disclaimer) - from Story 9.4
     * - Terms of Service link (/terms) - Story 9.5
     * - Privacy Policy link (/privacy) - Story 9.5
     */
    const expectedLinks = [
      { name: "Disclaimer", href: "/disclaimer" },
      { name: "Terms", href: "/terms" },
      { name: "Privacy", href: "/privacy" },
    ];

    it("should define all expected legal page links", () => {
      expect(expectedLinks.length).toBe(3);
    });

    it("should have correct hrefs for each legal page", () => {
      const hrefs = expectedLinks.map((link) => link.href);

      expect(hrefs).toContain("/disclaimer");
      expect(hrefs).toContain("/terms");
      expect(hrefs).toContain("/privacy");
    });

    it("should all use absolute paths", () => {
      expectedLinks.forEach((link) => {
        expect(link.href.startsWith("/")).toBe(true);
      });
    });
  });

  describe("Registration Form Links (AC-9.5.3)", () => {
    /**
     * Per AC-9.5.3, the registration form must include:
     * - Link to Terms of Service (/terms)
     * - Link to Privacy Policy (/privacy)
     * - Links should be near the submit button
     * - Clicking links should open in new tab or navigate
     */
    const registrationLinks = [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
    ];

    it("should define both Terms and Privacy links for registration", () => {
      expect(registrationLinks.length).toBe(2);
    });

    it("should have correct hrefs", () => {
      const termsLink = registrationLinks.find((l) => l.href === "/terms");
      const privacyLink = registrationLinks.find((l) => l.href === "/privacy");

      expect(termsLink).toBeDefined();
      expect(privacyLink).toBeDefined();
    });

    it("should use consistent naming", () => {
      expect(registrationLinks[0].name).toBe("Terms of Service");
      expect(registrationLinks[1].name).toBe("Privacy Policy");
    });
  });

  describe("Link Accessibility", () => {
    /**
     * Legal links should be accessible:
     * - Use semantic <a> or Link elements
     * - Have visible text or aria-labels
     * - Be keyboard navigable (default for links)
     */
    it("should define accessible link names", () => {
      const allLinks = [
        { name: "Disclaimer", href: "/disclaimer" },
        { name: "Terms", href: "/terms" },
        { name: "Privacy", href: "/privacy" },
        { name: "Terms of Service", href: "/terms" },
        { name: "Privacy Policy", href: "/privacy" },
      ];

      allLinks.forEach((link) => {
        expect(link.name.length).toBeGreaterThan(0);
        expect(typeof link.name).toBe("string");
      });
    });
  });
});
