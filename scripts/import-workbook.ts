import "dotenv/config";

import fs from "node:fs/promises";

import { Prisma, PrismaClient } from "@prisma/client";
import { parseSeatWorkbook } from "../lib/import/excel";

const filePath = process.argv[2];
const mode = process.argv.includes("--replace") ? "replace" : "upsert";
const db = new PrismaClient();

if (!filePath) {
  throw new Error("Usage: tsx scripts/import-workbook.ts <file.xlsx> [--replace]");
}

async function main() {
  const file = await fs.readFile(filePath as string);
  const result = await parseSeatWorkbook(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  );

  if (result.errors.length > 0) {
    console.error(JSON.stringify(result.errors.slice(0, 25), null, 2));
    throw new Error(`Workbook has ${result.errors.length} validation error(s).`);
  }

  if (mode === "replace") {
    await db.$transaction(async (tx) => {
      await tx.studentSeat.deleteMany();

      for (const row of result.rows) {
        await upsertActiveSeat(tx, toPrismaInput(row));
      }
    });
  } else {
    await db.$transaction(async (tx) => {
      for (const row of result.rows) {
        await upsertActiveSeat(tx, toPrismaInput(row));
      }
    });
  }

  console.log(
    `${mode === "replace" ? "Replaced" : "Upserted"} ${result.rows.length} seat row(s).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await db.$disconnect();
});

function toPrismaInput(row: Awaited<ReturnType<typeof parseSeatWorkbook>>["rows"][number]) {
  return {
    referenceId: row.referenceId.trim().toUpperCase(),
    sessionNo: row.sessionNo,
    studentId: row.studentId,
    seatNo: row.seatNo,
    stageAnnouncingName: row.stageAnnouncingName,
    ticketCategory: row.ticketCategory,
    balconyVisitorSeatNos: JSON.stringify(row.balconyVisitorSeatNos),
  };
}

async function upsertActiveSeat(
  tx: Prisma.TransactionClient,
  data: ReturnType<typeof toPrismaInput>
) {
  const active = await tx.studentSeat.findFirst({
    where: { referenceId: data.referenceId, status: "ACTIVE" },
    select: { id: true },
  });

  if (active) {
    return tx.studentSeat.update({
      where: { id: active.id },
      data: { ...data, activeReferenceKey: data.referenceId },
    });
  }

  return tx.studentSeat.create({
    data: { ...data, activeReferenceKey: data.referenceId },
  });
}
