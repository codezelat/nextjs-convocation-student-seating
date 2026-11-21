import { describe, expect, it } from "vitest";

import {
  buildSeatWhereInput,
  normalizeSeatStatus,
} from "@/lib/data/seat-filters";

describe("seat status normalization", () => {
  it("accepts known statuses and rejects everything else", () => {
    expect(normalizeSeatStatus("ACTIVE")).toBe("ACTIVE");
    expect(normalizeSeatStatus("OUTDATED")).toBe("OUTDATED");
    expect(normalizeSeatStatus("ALL")).toBe("ALL");
    expect(normalizeSeatStatus("deleted")).toBe("ALL");
    expect(normalizeSeatStatus("")).toBe("ALL");
    expect(normalizeSeatStatus(null)).toBe("ALL");
    expect(normalizeSeatStatus(undefined)).toBe("ALL");
  });
});

describe("seat where builder", () => {
  it("returns an empty filter for a blank query and ALL status", () => {
    expect(buildSeatWhereInput({ query: "   ", status: "ALL" })).toEqual({});
  });

  it("filters by status only", () => {
    expect(buildSeatWhereInput({ query: "", status: "OUTDATED" })).toEqual({
      status: "OUTDATED",
    });
  });

  it("searches across reference, student, seat, stage name and program", () => {
    expect(buildSeatWhereInput({ query: "J10", status: "ALL" })).toEqual({
      OR: [
        { referenceId: { contains: "J10" } },
        { studentId: { contains: "J10" } },
        { seatNo: { contains: "J10" } },
        { stageAnnouncingName: { contains: "J10" } },
        { programId: { contains: "J10" } },
      ],
    });
  });

  it("combines status and search with AND", () => {
    expect(buildSeatWhereInput({ query: "J10", status: "ACTIVE" })).toEqual({
      AND: [
        { status: "ACTIVE" },
        {
          OR: [
            { referenceId: { contains: "J10" } },
            { studentId: { contains: "J10" } },
            { seatNo: { contains: "J10" } },
            { stageAnnouncingName: { contains: "J10" } },
            { programId: { contains: "J10" } },
          ],
        },
      ],
    });
  });
});
