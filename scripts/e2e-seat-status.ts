import "dotenv/config";

import {
  findSeatByReference,
  saveSeat,
  setSeatsStatus,
  setSeatsStatusByFilter,
  listSeats,
  getSeatStats,
  deleteSeat,
} from "../lib/data/seats";

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  PASS ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}`, detail ?? "");
  }
}

async function main() {
  const REF = "J1003";
  const original = await findSeatByReference(REF);

  if (!original) {
    throw new Error(`Expected an active ${REF} row in dev.db to test with.`);
  }

  // Snapshot original row id via listing
  const listed = await listSeats({ query: REF, status: "ACTIVE" });
  const originalId = listed.seats.find((s) => s.referenceId === REF)?.id;
  if (!originalId) throw new Error("Could not resolve original row id.");

  console.log("\nS1 — baseline: active record is findable");
  check("findSeatByReference returns the record", Boolean(original));

  console.log("\nS2 — archive the record");
  const archived = await setSeatsStatus([originalId], "OUTDATED");
  check("updated count is 1", archived.updated === 1, archived);
  check("no conflicts", archived.conflicts.length === 0, archived);

  console.log("\nS3 — public lookup stops working");
  check("findSeatByReference is null", (await findSeatByReference(REF)) === null);

  console.log("\nS4 — stats + filters reflect the change");
  const stats = await getSeatStats();
  check("stats.outdated >= 1", stats.outdated >= 1, stats);
  const outdatedListing = await listSeats({ query: REF, status: "OUTDATED" });
  check("outdated filter finds it", outdatedListing.total === 1, outdatedListing);
  const activeListing = await listSeats({ query: REF, status: "ACTIVE" });
  check("active filter hides it", activeListing.total === 0, activeListing);

  console.log("\nS5 — re-adding the same reference while outdated creates a new active row");
  const readded = await saveSeat({
    ...original,
    seatNo: "E2E-NEW",
  });
  check("new row created", readded.status === "ACTIVE", readded);
  const found = await findSeatByReference(REF);
  check("public lookup finds the NEW row", found?.seatNo === "E2E-NEW", found);
  const bothRows = await listSeats({ query: REF, status: "ALL" });
  const refRows = bothRows.seats.filter((s) => s.referenceId === REF);
  check("two rows share the reference (1 outdated, 1 active)", refRows.length === 2, refRows.map((r) => r.status));

  console.log("\nS6 — restoring the old row conflicts with the newer active row");
  const conflicted = await setSeatsStatus([originalId], "ACTIVE");
  check("updated count is 0", conflicted.updated === 0, conflicted);
  check("conflict reports the reference", conflicted.conflicts.join() === REF, conflicted);

  console.log("\nS7 — archive both, oldest-first restore wins");
  await setSeatsStatus([readded.id], "OUTDATED");
  check("neither is findable", (await findSeatByReference(REF)) === null);
  const bulk = await setSeatsStatus([originalId, readded.id], "ACTIVE");
  check("oldest row restored", bulk.updated === 1, bulk);
  check("newer row reported as conflict", bulk.conflicts.join() === REF, bulk);
  const afterBulk = await findSeatByReference(REF);
  check("restored row is the ORIGINAL (seat matches)", afterBulk?.seatNo === original.seatNo, afterBulk);

  console.log("\nS8 — editing an outdated row by id keeps it outdated");
  await setSeatsStatus([readded.id], "OUTDATED");
  await saveSeat({ ...original, seatNo: "E2E-EDITED" }, readded.id);
  const editedRow = (await listSeats({ query: REF, status: "OUTDATED" })).seats[0];
  check("fields updated", editedRow?.seatNo === "E2E-EDITED", editedRow);
  check("still outdated", editedRow?.status === "OUTDATED", editedRow);

  console.log("\nS9 — DB-level uniqueness: a second active row with same reference is rejected");
  let uniqueViolation = false;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const raw = new PrismaClient();
    await raw.studentSeat.create({
      data: {
        referenceId: REF,
        sessionNo: "1",
        studentId: "dupe",
        seatNo: "dupe",
        stageAnnouncingName: "dupe",
        ticketCategory: "A",
        balconyVisitorSeatNos: "[]",
        status: "ACTIVE",
        activeReferenceKey: REF,
      },
    });
    await raw.$disconnect();
  } catch (error) {
    uniqueViolation =
      (error as { code?: string }).code === "P2002" ||
      String(error).includes("Unique constraint");
  }
  check("unique constraint fired (P2002)", uniqueViolation);

  console.log("\nS10 — all-matching scope archives every row for the reference");
  const byFilter = await setSeatsStatusByFilter({ query: REF, status: "ALL" }, "OUTDATED");
  check("both rows archived", byFilter.updated === 2, byFilter);
  check("lookup dead again", (await findSeatByReference(REF)) === null);

  console.log("\nS11 — cleanup: restore original state");
  await setSeatsStatus([originalId], "ACTIVE");
  await saveSeat({ ...original }, originalId);
  await deleteSeat(readded.id);
  const final = await findSeatByReference(REF);
  check("original record restored", final?.seatNo === original.seatNo, final);
  const finalRows = (await listSeats({ query: REF, status: "ALL" })).total;
  check("no duplicate rows remain", finalRows === 1, finalRows);

  console.log(
    failures === 0
      ? "\nALL SCENARIOS PASSED"
      : `\n${failures} CHECK(S) FAILED`
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
