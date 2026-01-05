import postgres from "postgres";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function showMigrations() {
  // Get migrations 19-28 from database
  const dbMigrations = await sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    WHERE id >= 19 AND id <= 28
    ORDER BY id ASC
  `;

  console.log("\n📊 Database migrations 19-28:");
  console.log("ID | Hash (first 16 chars)");
  console.log("---+--------------------");
  dbMigrations.forEach((m) => {
    const hashPreview = typeof m.hash === "string" ? m.hash.substring(0, 16) : "???";
    console.log(`${String(m.id).padStart(2)} | ${hashPreview}...`);
  });

  // Get expected migrations from local files
  const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  const entries = journal.entries || [];

  console.log("\n📋 Expected local migrations (idx 18-27 → IDs 19-28):");
  console.log("ID | Tag                                | Hash (first 16 chars)");
  console.log("---+------------------------------------+--------------------");

  for (let idx = 18; idx <= 27; idx++) {
    const entry = entries[idx];
    const id = idx + 1;
    const sqlFile = path.join(process.cwd(), "drizzle", `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(sqlFile, "utf-8");
    const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
    const hashPreview = hash.substring(0, 16);
    console.log(`${String(id).padStart(2)} | ${entry.tag.padEnd(34)} | ${hashPreview}...`);
  }

  // Compare
  console.log("\n🔍 Comparison:");
  for (let i = 0; i < 10; i++) {
    const id = 19 + i;
    const dbMig = dbMigrations[i];
    const localEntry = entries[18 + i];

    if (!dbMig) {
      console.log(`❌ ID ${id}: Missing in database (should be ${localEntry.tag})`);
    } else if (!localEntry) {
      console.log(`❌ ID ${id}: Orphaned in database`);
    } else {
      const sqlFile = path.join(process.cwd(), "drizzle", `${localEntry.tag}.sql`);
      const sqlContent = fs.readFileSync(sqlFile, "utf-8");
      const expectedHash = crypto.createHash("sha256").update(sqlContent).digest("hex");

      if (dbMig.hash === expectedHash) {
        console.log(`✅ ID ${id}: ${localEntry.tag} (hash matches)`);
      } else {
        console.log(
          `⚠️  ID ${id}: Hash mismatch - DB has different migration than ${localEntry.tag}`
        );
      }
    }
  }

  await sql.end();
}

showMigrations().catch(console.error);
