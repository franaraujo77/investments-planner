import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Database connection for Investments Planner
 *
 * Uses postgres.js driver with Drizzle ORM.
 * Configured for serverless environments (Neon/Vercel Postgres).
 *
 * Connection pooling is handled by postgres.js with serverless-optimized settings:
 * - max: 1 connection per serverless instance
 * - idle_timeout: 20s to release connections quickly
 * - connect_timeout: 10s to fail fast on connection issues
 *
 * The connection is created lazily to support test environments where
 * DATABASE_URL may not be properly configured.
 */

/**
 * Validate and sanitize the DATABASE_URL.
 *
 * The postgres.js library uses decodeURIComponent on the URL, which will fail
 * if the password contains unencoded special characters like '%'.
 *
 * This function attempts to parse the URL and provides a helpful error message
 * if the URL is malformed.
 */
function validateConnectionString(url: string): string {
  try {
    // Try to parse as URL to catch obvious issues
    const parsed = new URL(url);

    // Check if password needs encoding (contains % not followed by valid hex)
    if (parsed.password && /%(?![0-9A-Fa-f]{2})/.test(parsed.password)) {
      // Password contains '%' that isn't part of a percent-encoded sequence
      // This will cause postgres.js to fail with "URI malformed"
      const encodedPassword = encodeURIComponent(
        decodeURIComponent(parsed.password.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"))
      );
      parsed.password = encodedPassword;
      return parsed.toString();
    }

    return url;
  } catch (error) {
    // URL parsing failed - provide helpful error message
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `DATABASE_URL is malformed: ${message}. ` +
        `Ensure special characters in the password are URL-encoded ` +
        `(e.g., '%' should be '%25', '@' should be '%40').`
    );
  }
}

/**
 * Create the database connection.
 *
 * This is wrapped in a function to allow for error handling and
 * to support environments where DATABASE_URL is not configured.
 */
function createDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sanitizedConnectionString = validateConnectionString(connectionString);

  // Configure postgres.js for serverless environments
  const client = postgres(sanitizedConnectionString, {
    max: 1, // Single connection per serverless instance
    idle_timeout: 20, // Release idle connections after 20 seconds
    connect_timeout: 10, // Fail fast on connection issues
    prepare: false, // Disable prepared statements for serverless compatibility
  });

  return drizzle(client, { schema });
}

// Lazy initialization of the database connection
// In production, this runs immediately. In tests, mocks can intercept before this runs.
let _db: ReturnType<typeof createDatabaseConnection> | null = null;
let _dbError: Error | null = null;

// Try to create the connection immediately, but catch errors for test environments
try {
  _db = createDatabaseConnection();
} catch (error) {
  // Store the error to throw later when db is actually accessed
  _dbError = error instanceof Error ? error : new Error(String(error));
}

/**
 * Get the database instance.
 *
 * Throws if DATABASE_URL is not configured or malformed.
 * This allows tests to mock the db module before it's used.
 */
function getDb(): ReturnType<typeof createDatabaseConnection> {
  if (_dbError) {
    throw _dbError;
  }
  if (!_db) {
    throw new Error("Database connection not initialized");
  }
  return _db;
}

// Export the db instance (will throw on access if connection failed)
export const db = new Proxy({} as ReturnType<typeof createDatabaseConnection>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    // Bind functions to the real db instance
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});

// Export types for use throughout the app
export type Database = ReturnType<typeof createDatabaseConnection>;
