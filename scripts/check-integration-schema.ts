import postgres from "postgres";

async function checkSchema() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  console.log("\n🔍 Checking critical schema elements:\n");

  // Check tables from early migrations
  const tables = [
    "users",
    "portfolios",
    "portfolio_assets",
    "investments",
    "alert_preferences",
    "alerts",
    "recommendations",
    "dismissed_opportunity_pairs",
    "cached_gics_sectors",
    "cached_asset_types",
    "portfolio_accepted_asset_types",
  ];

  for (const tableName of tables) {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) as exists
    `;
    const exists = result[0]?.exists ?? false;
    console.log(`${tableName.padEnd(35)} ${exists ? "✅ EXISTS" : "❌ MISSING"}`);
  }

  // Check critical columns
  console.log("\n🔍 Checking critical columns:\n");

  const columns = [
    { table: "users", column: "locale" },
    { table: "alerts", column: "updated_at" },
    { table: "portfolios", column: "base_currency" },
  ];

  for (const { table, column } of columns) {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${table}
          AND column_name = ${column}
      ) as exists
    `;
    const exists = result[0]?.exists ?? false;
    console.log(`${`${table}.${column}`.padEnd(35)} ${exists ? "✅ EXISTS" : "❌ MISSING"}`);
  }

  // Check RLS
  console.log("\n🔍 Checking RLS status:\n");

  const rlsResult = await sql`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'portfolios', 'alerts')
    ORDER BY tablename
  `;

  rlsResult.forEach((row) => {
    console.log(
      `${String(row.tablename).padEnd(35)} ${row.rowsecurity ? "✅ RLS ENABLED" : "❌ RLS DISABLED"}`
    );
  });

  await sql.end();
}

checkSchema().catch(console.error);
