/**
 * Fetch With Retry Utility Tests
 *
 * Tests for client-side fetch wrapper with exponential backoff retry logic.
 * @see src/lib/utils/fetch-with-retry.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry, postWithRetry } from "@/lib/utils/fetch-with-retry";

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =============================================================================
  // SUCCESS SCENARIOS
  // =============================================================================

  describe("success scenarios", () => {
    it("returns data on successful first attempt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "123", name: "Test" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry<{ id: string; name: string }>("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ id: "123", name: "Test" });
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("passes fetch options correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ created: true }),
        headers: new Headers(),
      });

      const options: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      };

      const resultPromise = fetchWithRetry("/api/test", options);
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(mockFetch).toHaveBeenCalledWith("/api/test", options);
    });
  });

  // =============================================================================
  // RETRY SCENARIOS
  // =============================================================================

  describe("429 rate limit retry", () => {
    it("retries on 429 response with exponential backoff", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: "Rate limited" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: new Headers(),
        });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        maxRetries: 3,
        initialDelayMs: 1000,
      });

      // First attempt fails immediately
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance past first backoff delay
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.ok).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("respects Retry-After header", async () => {
      const headers = new Headers();
      headers.set("Retry-After", "5");

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: "Rate limited" }),
          headers,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: new Headers(),
        });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        maxRetries: 3,
        initialDelayMs: 1000,
      });

      // Should wait 5 seconds as specified in Retry-After header
      await vi.advanceTimersByTimeAsync(4999);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
    });
  });

  describe("503/504 retry", () => {
    it("retries on 503 Service Unavailable", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ error: "Service unavailable" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: new Headers(),
        });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        initialDelayMs: 100,
      });

      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("retries on 504 Gateway Timeout", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 504,
          json: () => Promise.resolve({ error: "Gateway timeout" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: new Headers(),
        });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        initialDelayMs: 100,
      });

      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
    });
  });

  describe("max retries exceeded", () => {
    it("returns error after all retries exhausted", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: "Rate limited" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        maxRetries: 2,
        initialDelayMs: 100,
        backoffMultiplier: 2,
      });

      // Run through all retries
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.status).toBe(429);
      expect(result.attempts).toBe(3); // Initial + 2 retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // =============================================================================
  // NETWORK ERRORS
  // =============================================================================

  describe("network errors", () => {
    it("retries on network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        maxRetries: 3,
        initialDelayMs: 100,
      });

      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("returns error after network errors exhaust retries", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        maxRetries: 2,
        initialDelayMs: 100,
      });

      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.attempts).toBe(3);
    });
  });

  // =============================================================================
  // NON-RETRYABLE STATUS CODES
  // =============================================================================

  describe("non-retryable status codes", () => {
    it("does not retry on 400 Bad Request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Bad request" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe("Bad request");
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not retry on 401 Unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.attempts).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not retry on 403 Forbidden", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Forbidden" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not retry on 404 Not Found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not retry on 422 Unprocessable Entity", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ error: "Validation error" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.status).toBe(422);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not retry on 500 Internal Server Error by default", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal server error" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // CUSTOM CONFIGURATION
  // =============================================================================

  describe("custom configuration", () => {
    it("uses custom retry status codes", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Server error" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: new Headers(),
        });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        retryStatusCodes: [500],
        initialDelayMs: 100,
      });

      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("respects maxDelayMs cap", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: "Rate limited" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: "Rate limited" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: new Headers(),
        });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        maxRetries: 3,
        initialDelayMs: 5000,
        backoffMultiplier: 10,
        maxDelayMs: 8000, // Should cap delays at 8000ms
      });

      // First backoff should be 5000ms
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second backoff should be capped at 8000ms (not 50000ms)
      await vi.advanceTimersByTimeAsync(8000);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
    });

    it("caps Retry-After at maxDelayMs", async () => {
      const headers = new Headers();
      headers.set("Retry-After", "60"); // 60 seconds

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: "Rate limited" }),
          headers,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          headers: new Headers(),
        });

      const resultPromise = fetchWithRetry("/api/test", undefined, {
        maxDelayMs: 5000, // Cap at 5 seconds instead of 60
      });

      // Should retry after 5 seconds (capped), not 60
      await vi.advanceTimersByTimeAsync(5000);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.ok).toBe(true);
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  describe("error handling", () => {
    it("returns error from failed response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Validation failed" }),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Validation failed");
    });

    it("uses default error message when error not in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      });

      const resultPromise = fetchWithRetry("/api/test");
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Request failed with status 500");
    });
  });
});

// =============================================================================
// POST WITH RETRY
// =============================================================================

describe("postWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends POST request with JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: "123" }),
      headers: new Headers(),
    });

    const data = { name: "Test", value: 42 };
    const resultPromise = postWithRetry<{ id: string }>("/api/items", data);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ id: "123" });
    expect(mockFetch).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  });

  it("retries POST requests on 429", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: "Rate limited" }),
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: "123" }),
        headers: new Headers(),
      });

    const resultPromise = postWithRetry("/api/items", { name: "Test" }, { initialDelayMs: 100 });

    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
