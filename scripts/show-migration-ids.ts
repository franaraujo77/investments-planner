import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function show() {
  const migrations = await sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY id ASC
    LIMIT 10
  `;

  console.log("\n📋 First 10 migrations in database:\n");
  migrations.forEach((m) => {
    const hashPreview =
      typeof m.hash === "string" ? m.hash.substring(0, 16) : String(m.hash).substring(0, 16);
    console.log(`ID: ${m.id}, Hash: ${hashPreview}...`);
  });

  await sql.end();
}

show().catch(console.error);
