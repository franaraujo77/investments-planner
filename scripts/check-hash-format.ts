import postgres from "postgres";

async function checkHash() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const result = await sql`SELECT id, hash FROM drizzle.__drizzle_migrations WHERE id = 1`;
  console.log("First migration:", result[0]);
  await sql.end();
}

checkHash();
