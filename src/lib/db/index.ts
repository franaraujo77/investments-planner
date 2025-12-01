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
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Configure postgres.js for serverless environments
const client = postgres(connectionString, {
  max: 1, // Single connection per serverless instance
  idle_timeout: 20, // Release idle connections after 20 seconds
  connect_timeout: 10, // Fail fast on connection issues
  prepare: false, // Disable prepared statements for serverless compatibility
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export types for use throughout the app
export type Database = typeof db;
