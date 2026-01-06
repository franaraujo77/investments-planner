import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function check() {
  console.log("\n🔍 Checking migration tables in different schemas...\n");

  // Check drizzle schema
  try {
    const drizzleSchema = await sql`
      SELECT id, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `;
    console.log("📊 drizzle.__drizzle_migrations (first 5):");
    drizzleSchema.forEach((row) => {
      console.log(`  - ${row.id} (${row.created_at})`);
    });

    const drizzleCount = await sql`SELECT COUNT(*) as count FROM drizzle.__drizzle_migrations`;
    console.log(`\n📈 Total in drizzle schema: ${drizzleCount[0]?.count ?? 0}`);
  } catch (e) {
    console.log("❌ drizzle.__drizzle_migrations doesn't exist or can't be queried");
    console.log("   Error:", e instanceof Error ? e.message : String(e));
  }

  // Check public schema
  try {
    const publicSchema = await sql`
      SELECT id, created_at
      FROM __drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `;
    console.log("\n📊 public.__drizzle_migrations (first 5):");
    publicSchema.forEach((row) => {
      console.log(`  - ${row.id} (${row.created_at})`);
    });

    const publicCount = await sql`SELECT COUNT(*) as count FROM __drizzle_migrations`;
    console.log(`\n📈 Total in public schema: ${publicCount[0]?.count ?? 0}`);
  } catch (_e) {
    console.log("\n❌ public.__drizzle_migrations doesn't exist");
  }

  await sql.end();
}

check().catch(console.error);
