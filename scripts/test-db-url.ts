/**
 * Quick script to test if DATABASE_URL is compatible with integration tests
 */

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log("❌ DATABASE_URL is not set");
  process.exit(1);
}

// Check if it's a dummy URL
const DUMMY_DATABASE_URLS = [
  "postgresql://test:test@localhost:5432/test",
  "postgresql://test:test@localhost:5432/test_integration",
  "postgresql://ci_build_user:not_a_real_password@localhost:5432/ci_build_db",
];

if (DUMMY_DATABASE_URLS.includes(dbUrl)) {
  console.log("❌ DATABASE_URL is a dummy/placeholder URL");
  console.log("   Current:", dbUrl);
  process.exit(1);
}

// Check postgres.js compatibility
function isValidPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Validate password can be decoded by postgres.js
    if (parsed.password) {
      try {
        const decoded = decodeURIComponent(parsed.password);
        // postgres.js may decode again if the result contains %
        if (decoded.includes("%")) {
          decodeURIComponent(decoded);
        }
      } catch (e) {
        console.log("❌ Password contains invalid URL encoding for postgres.js");
        console.log("   Error:", e instanceof Error ? e.message : String(e));
        return false;
      }
    }

    // Validate username similarly
    if (parsed.username) {
      try {
        const decoded = decodeURIComponent(parsed.username);
        if (decoded.includes("%")) {
          decodeURIComponent(decoded);
        }
      } catch (e) {
        console.log("❌ Username contains invalid URL encoding for postgres.js");
        console.log("   Error:", e instanceof Error ? e.message : String(e));
        return false;
      }
    }

    return true;
  } catch (e) {
    console.log("❌ DATABASE_URL is not a valid URL");
    console.log("   Error:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

if (!isValidPostgresUrl(dbUrl)) {
  console.log("\n💡 Fix: Re-encode your DATABASE_URL password properly");
  console.log("   Current URL (redacted):", dbUrl.replace(/:\/\/[^@]+@/, "://***:***@"));
  process.exit(1);
}

console.log("✅ DATABASE_URL is valid and compatible with integration tests");
console.log("   Host:", new URL(dbUrl).hostname);
console.log("   Database:", new URL(dbUrl).pathname.slice(1));
