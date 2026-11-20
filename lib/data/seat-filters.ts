export const SEAT_STATUSES = ["ACTIVE", "OUTDATED"] as const;

export type SeatStatus = (typeof SEAT_STATUSES)[number];

export type SeatStatusFilter = SeatStatus | "ALL";

export function normalizeSeatStatus(
  value: string | null | undefined
): SeatStatusFilter {
  return value === "OUTDATED" || value === "ACTIVE" ? value : "ALL";
}

/**
 * Shared WHERE builder so the listing table and the "select all matching"
 * bulk-action scope always resolve to the exact same set of rows.
 */
export function buildSeatWhereInput({
  query,
  status,
}: {
  query: string;
  status: SeatStatusFilter;
}) {
  const trimmedQuery = query.trim();
  const conditions: object[] = [];

  if (status !== "ALL") {
    conditions.push({ status });
  }

  if (trimmedQuery) {
    conditions.push({
      OR: [
        { referenceId: { contains: trimmedQuery } },
        { studentId: { contains: trimmedQuery } },
        { seatNo: { contains: trimmedQuery } },
        { stageAnnouncingName: { contains: trimmedQuery } },
      ],
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { AND: conditions };
}
