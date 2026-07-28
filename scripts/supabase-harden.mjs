/**
 * Apply scripts/supabase-harden.sql against DIRECT_URL (or DATABASE_URL).
 * Usage: npm run db:harden
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "supabase-harden.sql");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || url.startsWith("file:")) {
  console.error("db:harden failed — set DIRECT_URL or DATABASE_URL to Postgres");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

function statementsFromSql(sql) {
  const withoutLineComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutLineComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const sql = readFileSync(sqlPath, "utf8");
  const statements = statementsFromSql(sql);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
    console.log("ok:", statement.slice(0, 80).replace(/\s+/g, " "));
  }
  console.log("db:harden complete");
}

main()
  .catch((err) => {
    console.error("db:harden failed");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
