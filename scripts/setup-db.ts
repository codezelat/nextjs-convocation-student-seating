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
const certificateMigrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "000002_certificate_requests",
  "migration.sql"
);
const seatStatusMigrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "000003_seat_status",
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

const hasCertificateRequestTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
  .get("CertificateRequest");

if (!hasCertificateRequestTable) {
  db.exec(fs.readFileSync(certificateMigrationPath, "utf8"));
}

const hasSeatStatusColumn = db
  .prepare("SELECT name FROM pragma_table_info('StudentSeat') WHERE name = ?")
  .get("status");

if (!hasSeatStatusColumn) {
  db.exec(fs.readFileSync(seatStatusMigrationPath, "utf8"));
}

db.close();

console.log(`SQLite database ready at ${resolvedDbPath}`);
