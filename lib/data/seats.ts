import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SeatImportRow, TicketCategory } from "@/lib/import/seat-workbook";
import {
  buildSeatWhereInput,
  type SeatStatus,
  type SeatStatusFilter,
} from "@/lib/data/seat-filters";

export { SEAT_STATUSES } from "@/lib/data/seat-filters";
export type { SeatStatus, SeatStatusFilter } from "@/lib/data/seat-filters";

export class SeatConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeatConflictError";
  }
}

export type PublicSeatResult = {
  referenceId: string;
  sessionNo: string;
  studentId: string;
  seatNo: string;
  stageAnnouncingName: string;
  ticketCategory: TicketCategory;
  balconyVisitorSeatNos: string[];
};

export type AdminSeatRow = PublicSeatResult & {
  id: string;
  status: SeatStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type SeatInput = SeatImportRow;

export type SeatStatusUpdateResult = {
  updated: number;
  conflicts: string[];
};

const seatSelect = {
  id: true,
  referenceId: true,
  sessionNo: true,
  studentId: true,
  seatNo: true,
  stageAnnouncingName: true,
  ticketCategory: true,
  balconyVisitorSeatNos: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSeatSelect;

export async function findSeatByReference(referenceId: string) {
  const seat = await db.studentSeat.findFirst({
    where: {
      referenceId: referenceId.trim().toUpperCase(),
      status: "ACTIVE",
    },
    select: seatSelect,
  });

  return seat ? toSeatDto(seat) : null;
}

export async function findSeatById(id: string) {
  const seat = await db.studentSeat.findUnique({
    where: { id },
    select: seatSelect,
  });

  return seat ? toSeatDto(seat) : null;
}

export async function listSeats({
  query = "",
  status = "ALL",
  page = 1,
  pageSize = 20,
}: {
  query?: string;
  status?: SeatStatusFilter;
  page?: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const where = buildSeatWhereInput({ query, status });

  const [total, seats] = await Promise.all([
    db.studentSeat.count({ where }),
    db.studentSeat.findMany({
      where,
      select: seatSelect,
      orderBy: [{ sessionNo: "asc" }, { seatNo: "asc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
  ]);

  return {
    seats: seats.map(toSeatDto),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function getSeatStats() {
  const [total, active, ticketGroups] = await Promise.all([
    db.studentSeat.count(),
    db.studentSeat.count({ where: { status: "ACTIVE" } }),
    db.studentSeat.groupBy({
      by: ["ticketCategory"],
      _count: true,
      where: { status: "ACTIVE" },
    }),
  ]);

  return {
    total,
    active,
    outdated: total - active,
    tickets: Object.fromEntries(
      ticketGroups.map((group) => [group.ticketCategory, group._count])
    ) as Partial<Record<TicketCategory, number>>,
  };
}

/**
 * Create or update the ACTIVE record for a reference ID. When `id` is given
 * (manual edit), that exact row is updated instead — even if it is outdated,
 * so editing never silently resurrects or duplicates an archived record.
 */
export async function saveSeat(input: SeatInput, id?: string) {
  const data = toPrismaInput(input);

  return db.$transaction(async (tx) => {
    if (id) {
      const row = await tx.studentSeat.findUnique({ where: { id } });

      if (!row) {
        throw new Error("That record no longer exists. Refresh and try again.");
      }

      if (row.status === "ACTIVE") {
        await assertReferenceAvailable(tx, data.referenceId, row.id);
        return tx.studentSeat.update({
          where: { id: row.id },
          data: { ...data, activeReferenceKey: data.referenceId },
        });
      }

      return tx.studentSeat.update({ where: { id: row.id }, data });
    }

    return upsertActiveSeat(tx, data);
  });
}

export async function upsertSeats(inputs: SeatInput[]) {
  return db.$transaction(async (tx) => {
    for (const input of inputs) {
      await upsertActiveSeat(tx, toPrismaInput(input));
    }
  });
}

export async function deleteSeat(id: string) {
  return db.studentSeat.delete({ where: { id } });
}

export async function replaceSeats(inputs: SeatInput[]) {
  return db.$transaction(async (tx) => {
    await tx.studentSeat.deleteMany();

    for (const input of inputs) {
      await upsertActiveSeat(tx, toPrismaInput(input));
    }
  });
}

/**
 * Archive or restore records. Archiving always succeeds (it only frees the
 * reference ID). Restoring skips records whose reference ID is already held
 * by another active record and reports those reference IDs as conflicts.
 */
export async function setSeatsStatus(
  ids: string[],
  status: SeatStatus
): Promise<SeatStatusUpdateResult> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { updated: 0, conflicts: [] };
  }

  if (status === "OUTDATED") {
    const result = await db.studentSeat.updateMany({
      where: { id: { in: uniqueIds } },
      data: { status: "OUTDATED", activeReferenceKey: null },
    });

    return { updated: result.count, conflicts: [] };
  }

  return db.$transaction(async (tx) => {
    const rows = await tx.studentSeat.findMany({
      where: { id: { in: uniqueIds } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, referenceId: true, status: true },
    });

    let updated = 0;
    const conflicts: string[] = [];

    for (const row of rows) {
      if (row.status === "ACTIVE") {
        updated += 1;
        continue;
      }

      const clash = await tx.studentSeat.findFirst({
        where: {
          referenceId: row.referenceId,
          status: "ACTIVE",
          id: { not: row.id },
        },
        select: { referenceId: true },
      });

      if (clash) {
        conflicts.push(row.referenceId);
        continue;
      }

      await tx.studentSeat.update({
        where: { id: row.id },
        data: { status: "ACTIVE", activeReferenceKey: row.referenceId },
      });
      updated += 1;
    }

    return { updated, conflicts };
  });
}

export async function setSeatsStatusByFilter(
  filter: { query: string; status: SeatStatusFilter },
  status: SeatStatus
): Promise<SeatStatusUpdateResult> {
  const rows = await db.studentSeat.findMany({
    where: buildSeatWhereInput(filter),
    select: { id: true },
  });

  return setSeatsStatus(
    rows.map((row) => row.id),
    status
  );
}

async function upsertActiveSeat(
  tx: Prisma.TransactionClient,
  data: Prisma.StudentSeatCreateInput
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

  try {
    return await tx.studentSeat.create({
      data: { ...data, activeReferenceKey: data.referenceId },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new SeatConflictError(
        `Reference ${data.referenceId} is already active on another record.`
      );
    }
    throw error;
  }
}

async function assertReferenceAvailable(
  tx: Prisma.TransactionClient,
  referenceId: string,
  excludeId: string
) {
  const clash = await tx.studentSeat.findFirst({
    where: { referenceId, status: "ACTIVE", id: { not: excludeId } },
    select: { referenceId: true },
  });

  if (clash) {
    throw new SeatConflictError(
      `Reference ${referenceId} is already active on another record.`
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toPrismaInput(input: SeatInput): Prisma.StudentSeatCreateInput {
  return {
    referenceId: input.referenceId.trim().toUpperCase(),
    sessionNo: input.sessionNo,
    studentId: input.studentId,
    seatNo: input.seatNo,
    stageAnnouncingName: input.stageAnnouncingName,
    ticketCategory: input.ticketCategory,
    balconyVisitorSeatNos: JSON.stringify(input.balconyVisitorSeatNos),
  };
}

function toSeatDto(seat: {
  id: string;
  referenceId: string;
  sessionNo: string;
  studentId: string;
  seatNo: string;
  stageAnnouncingName: string;
  ticketCategory: string;
  balconyVisitorSeatNos: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AdminSeatRow {
  return {
    ...seat,
    status: seat.status === "OUTDATED" ? "OUTDATED" : "ACTIVE",
    ticketCategory: seat.ticketCategory as TicketCategory,
    balconyVisitorSeatNos: parseVisitorSeats(seat.balconyVisitorSeatNos),
  };
}

function parseVisitorSeats(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
