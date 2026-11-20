import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * One-off backfill for databases migrated in place (e.g. production MySQL via
 * `prisma db push`): active rows must carry activeReferenceKey = referenceId
 * so the "one active record per reference ID" guarantee holds.
 */
async function main() {
  const rows = await db.studentSeat.findMany({
    where: { status: "ACTIVE", activeReferenceKey: null },
    select: { id: true, referenceId: true },
  });

  for (const row of rows) {
    await db.studentSeat.update({
      where: { id: row.id },
      data: { activeReferenceKey: row.referenceId },
    });
  }

  console.log(`Backfilled activeReferenceKey for ${rows.length} seat row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
