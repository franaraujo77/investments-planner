import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function list() {
  const migrations = await sql`
    SELECT id
    FROM drizzle.__drizzle_migrations
    ORDER BY id ASC
  `;

  console.log("\n📋 All migration IDs in production:");
  const idList = migrations.map((m) => m.id).join(", ");
  console.log(idList);
  console.log(`\nTotal: ${migrations.length} migrations`);

  // Check for gaps
  const ids = migrations.map((m) => Number(m.id)).sort((a, b) => a - b);
  const gaps: number[] = [];
  const firstId = ids[0];
  const lastId = ids[ids.length - 1];

  if (firstId !== undefined && lastId !== undefined) {
    for (let i = firstId; i <= lastId; i++) {
      if (!ids.includes(i)) {
        gaps.push(i);
      }
    }
  }

  if (gaps.length > 0) {
    const gapList = gaps.join(", ");
    console.log(`\n⚠️ Gaps in ID sequence: ${gapList}`);
  } else {
    console.log("\n✅ No gaps in ID sequence");
  }

  await sql.end();
}

list().catch(console.error);
