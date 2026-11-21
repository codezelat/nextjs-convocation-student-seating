import { readFile } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const text = z.string();
const date = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const seat = z.strictObject({
  id: text,
  referenceId: text,
  sessionNo: text,
  studentId: text,
  seatNo: text,
  stageAnnouncingName: text,
  ticketCategory: text,
  balconyVisitorSeatNos: text,
  status: z.enum(["ACTIVE", "OUTDATED"]).optional(),
  activeReferenceKey: text.nullable().optional(),
  createdAt: date,
  updatedAt: date,
});

const certificate = z.strictObject({
  id: text,
  studentId: text,
  fullName: text,
  whatsappNumber: text,
  deliveryAddress: text,
  district: text,
  deliveryContactNumber: text,
  receiptObjectKey: text,
  receiptFileName: text,
  receiptContentType: text,
  receiptSizeBytes: z.number().int().positive(),
  status: text,
  internalNote: text.nullable(),
  courierReference: text.nullable(),
  sourceHash: text.nullable(),
  confirmedAt: date,
  createdAt: date,
  updatedAt: date,
});

const snapshot = z.strictObject({
  seats: z.array(seat).min(1),
  certificateRequests: z.array(certificate),
});

function compareRows<T extends { id: string }>(expected: T[], actual: T[]) {
  if (expected.length !== actual.length) return false;
  const byId = new Map(actual.map((row) => [row.id, row]));

  return expected.every((row) => {
    const stored = byId.get(row.id);
    return stored && Object.entries(row).every(([key, value]) =>
      JSON.stringify(value) === JSON.stringify(stored[key as keyof T])
    );
  });
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Provide the private source snapshot file path.");

  const data = snapshot.safeParse(JSON.parse(await readFile(path, "utf8")));
  if (!data.success) {
    throw new Error("The snapshot is missing data or contains unsupported fields. No rows were written.");
  }

  const seats = data.data.seats.map((row) => {
    const status = row.status ?? "ACTIVE";
    const expectedKey = status === "ACTIVE" ? row.referenceId : null;
    if (row.activeReferenceKey !== undefined && row.activeReferenceKey !== expectedKey) {
      throw new Error("The source has an inconsistent active reference key. No rows were written.");
    }
    return { ...row, status, activeReferenceKey: expectedKey };
  });
  const certificates = data.data.certificateRequests;

  const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_DIRECT });
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "StudentSeat", "CertificateRequest" IN SHARE ROW EXCLUSIVE MODE`;
      const count = await tx.studentSeat.count() + await tx.certificateRequest.count();
      if (count === 0) {
        await tx.studentSeat.createMany({ data: seats });
        await tx.certificateRequest.createMany({ data: certificates });
      }

      const [targetSeats, targetCertificates] = await Promise.all([
        tx.studentSeat.findMany(),
        tx.certificateRequest.findMany(),
      ]);
      if (!compareRows(seats, targetSeats) || !compareRows(certificates, targetCertificates)) {
        throw new Error("Target records differ from the snapshot. No changes committed.");
      }
    }, { timeout: 60_000 });
  } finally {
    await db.$disconnect();
  }

  console.log(`Verified ${seats.length} seats and ${certificates.length} certificate requests, field by field.`);
}

main().catch((error: unknown) => {
  if (error instanceof Error && error.constructor === Error) {
    console.error(error.message);
  } else {
    console.error("Snapshot import failed. No changes committed.");
  }
  process.exitCode = 1;
});
