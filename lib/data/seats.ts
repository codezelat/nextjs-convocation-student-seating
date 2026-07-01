import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SeatImportRow, TicketCategory } from "@/lib/import/seat-workbook";

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
  createdAt: Date;
  updatedAt: Date;
};

export type SeatInput = SeatImportRow;

const seatSelect = {
  id: true,
  referenceId: true,
  sessionNo: true,
  studentId: true,
  seatNo: true,
  stageAnnouncingName: true,
  ticketCategory: true,
  balconyVisitorSeatNos: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSeatSelect;

export async function findSeatByReference(referenceId: string) {
  const seat = await db.studentSeat.findUnique({
    where: { referenceId: referenceId.trim().toUpperCase() },
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
  page = 1,
  pageSize = 20,
}: {
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));
  const trimmedQuery = query.trim();
  const where: Prisma.StudentSeatWhereInput = trimmedQuery
    ? {
        OR: [
          { referenceId: { contains: trimmedQuery } },
          { studentId: { contains: trimmedQuery } },
          { seatNo: { contains: trimmedQuery } },
          { stageAnnouncingName: { contains: trimmedQuery } },
        ],
      }
    : {};

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
  const [total, ticketGroups] = await Promise.all([
    db.studentSeat.count(),
    db.studentSeat.groupBy({
      by: ["ticketCategory"],
      _count: true,
    }),
  ]);

  return {
    total,
    tickets: Object.fromEntries(
      ticketGroups.map((group) => [group.ticketCategory, group._count])
    ) as Partial<Record<TicketCategory, number>>,
  };
}

export async function upsertSeat(input: SeatInput) {
  const data = toPrismaInput(input);

  return db.studentSeat.upsert({
    where: { referenceId: data.referenceId },
    create: data,
    update: data,
  });
}

export async function upsertSeats(inputs: SeatInput[]) {
  return db.$transaction(
    inputs.map((input) => {
      const data = toPrismaInput(input);

      return db.studentSeat.upsert({
        where: { referenceId: data.referenceId },
        create: data,
        update: data,
      });
    })
  );
}

export async function deleteSeat(id: string) {
  return db.studentSeat.delete({ where: { id } });
}

export async function replaceSeats(inputs: SeatInput[]) {
  return db.$transaction(async (tx) => {
    await tx.studentSeat.deleteMany();

    for (const input of inputs) {
      await tx.studentSeat.create({ data: toPrismaInput(input) });
    }
  });
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
  createdAt: Date;
  updatedAt: Date;
}): AdminSeatRow {
  return {
    ...seat,
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
