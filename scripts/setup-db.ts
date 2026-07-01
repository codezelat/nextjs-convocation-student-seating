import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbPath = databaseUrl.replace(/^file:/, "");
const resolvedDbPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), "prisma", dbPath.replace(/^\.\//, ""));
const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "000001_init",
  "migration.sql"
);

fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

const sql = fs.readFileSync(migrationPath, "utf8");
const db = new Database(resolvedDbPath);

db.pragma("journal_mode = WAL");
const hasAdminTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
  .get("AdminUser");

if (!hasAdminTable) {
  db.exec(sql);
}
db.close();

console.log(`SQLite database ready at ${resolvedDbPath}`);
