import postgres from "postgres";

async function checkSchema() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  console.log("\n🔍 Checking if migrations 0018-0027 schema changes exist:\n");

  // 0027: alerts.updated_at
  const alertsUpdatedAt = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'alerts'
      AND column_name = 'updated_at'
    ) as exists
  `;
  console.log(
    `0027 (alerts.updated_at):                      ${alertsUpdatedAt[0]?.exists ? "✅ EXISTS" : "❌ MISSING"}`
  );

  // 0021: cached_gics tables
  const gicsTables = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'cached_gics_sectors'
    ) as exists
  `;
  console.log(
    `0021 (cached_gics_sectors table):              ${gicsTables[0]?.exists ? "✅ EXISTS" : "❌ MISSING"}`
  );

  // 0022: cached_asset_types
  const assetTypes = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'cached_asset_types'
    ) as exists
  `;
  console.log(
    `0022 (cached_asset_types table):               ${assetTypes[0]?.exists ? "✅ EXISTS" : "❌ MISSING"}`
  );

  // 0024: recommendations table changes
  const recTable = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'recommendations'
    ) as exists
  `;
  console.log(
    `0024 (recommendations table):                  ${recTable[0]?.exists ? "✅ EXISTS" : "❌ MISSING"}`
  );

  // 0025: dismissed_opportunity_pairs
  const dismissedPairs = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'dismissed_opportunity_pairs'
    ) as exists
  `;
  console.log(
    `0025 (dismissed_opportunity_pairs table):      ${dismissedPairs[0]?.exists ? "✅ EXISTS" : "❌ MISSING"}`
  );

  await sql.end();
}

checkSchema().catch(console.error);
