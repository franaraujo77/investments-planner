import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

// Check if alerts.updated_at column exists
const result = await sql`
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'alerts'
    AND column_name = 'updated_at'
  ) as exists
`;

console.log("alerts.updated_at exists:", result[0]?.exists);
await sql.end();
