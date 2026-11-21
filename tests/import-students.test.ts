import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import { GET as downloadSampleWorkbook } from "@/app/api/sample-format/route";
import { parseSeatWorkbook } from "@/lib/import/excel";
import {
  parseSeatRows,
  ticketVisitorSeatCount,
} from "@/lib/import/seat-workbook";

describe("seat workbook import", () => {
  it("round-trips the last Program ID column and preserves Excel text and zero", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await (await downloadSampleWorkbook()).arrayBuffer());
    const sheet = workbook.worksheets[0];
    expect(sheet.getRow(1).getCell(9).value).toBe("Program ID");
    expect(sheet.getCell("I2").numFmt).toBe("@");
    const sample = await parseSeatWorkbook(await workbook.xlsx.writeBuffer());
    expect(sample.errors).toEqual([]);
    expect(sample.rows.map((row) => row.programId)).toEqual(["PSY", undefined]);

    sheet.getCell("I2").value = " 001 ";
    sheet.getCell("I3").value = 0;
    const imported = await parseSeatWorkbook(await workbook.xlsx.writeBuffer());
    expect(imported.errors).toEqual([]);
    expect(imported.rows.map((row) => row.programId)).toEqual(["001", "0"]);
  });

  it("validates Program ID without treating it as a visitor seat", () => {
    const header = ["Session", "Reference", "Student ID", "Seat No", "Stage Name", "Ticket", "Balcony Visitor Seat", "Programme ID"];
    const row = [1, "J1001", "S001", 101, "Sample Graduate", "B", "Balcony 101"];
    const result = parseSeatRows([
      header,
      [...row, " PSY-01 "],
      [...row, "-"],
      [...row, "P".repeat(33)],
      [...row, "PSY\n01"],
      [...row, { formula: "A2" }],
    ]);
    expect(result.rows.map((item) => [item.programId, item.balconyVisitorSeatNos])).toEqual([
      ["PSY-01", ["Balcony 101"]],
      [undefined, ["Balcony 101"]],
    ]);
    expect(result.errors.map((error) => error.rowNumber)).toEqual([4, 5, 6]);
    expect(parseSeatRows([[...header, "Program ID"], row]).errors).toEqual([
      { rowNumber: 1, message: "Use only one Program ID column." },
    ]);
  });

  it("normalizes legacy SITC sheet headers and blank second visitor seat header", () => {
    const result = parseSeatRows([
      [
        "Session",
        "Reference ",
        "Student ID",
        "SEET N",
        "Stage Announcing Name ",
        "Ticket",
        "Balcony Visitors Seat N",
        "",
      ],
      [
        1,
        " J1003 ",
        "PSBUC/SITC/DQ/DIP/HRM/SL26/0085",
        399,
        "ඩබ්ලිව්. ජී. දිනිති නිමේෂ්‍යා ජනනි ගමගේ",
        "C",
        "Balcony 659",
        "Balcony 660",
      ],
      [
        1,
        "J1006",
        "PSBU/SITC/DIP/HRM/SL0012961",
        401,
        "ඉස්තෝම්බු මුදලිගේ රිද්මි ආශීංෂනී ගුණවර්ධන",
        "A",
        "",
        "",
      ],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        referenceId: "J1003",
        sessionNo: "1",
        studentId: "PSBUC/SITC/DQ/DIP/HRM/SL26/0085",
        seatNo: "399",
        stageAnnouncingName:
          "ඩබ්ලිව්. ජී. දිනිති නිමේෂ්‍යා ජනනි ගමගේ",
        ticketCategory: "C",
        balconyVisitorSeatNos: ["Balcony 659", "Balcony 660"],
      },
      {
        referenceId: "J1006",
        sessionNo: "1",
        studentId: "PSBU/SITC/DIP/HRM/SL0012961",
        seatNo: "401",
        stageAnnouncingName:
          "ඉස්තෝම්බු මුදලිගේ රිද්මි ආශීංෂනී ගුණවර්ධන",
        ticketCategory: "A",
        balconyVisitorSeatNos: [],
      },
    ]);
  });

  it("accepts corrected and alternate column headings", () => {
    const result = parseSeatRows([
      [
        "Session No",
        "Ref ID",
        "Student Number",
        "Seat Number",
        "Stage Name",
        "Ticket Category",
        "Visitor Seat 1",
        "Visitor Seat 2",
      ],
      [
        2,
        "J3001",
        "STU-3001",
        701,
        "Alternate Header Student",
        "C",
        699,
        700,
      ],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      referenceId: "J3001",
      sessionNo: "2",
      studentId: "STU-3001",
      seatNo: "701",
      stageAnnouncingName: "Alternate Header Student",
      ticketCategory: "C",
      balconyVisitorSeatNos: ["699", "700"],
    });
  });

  it("accepts minor mistakes across every required heading", () => {
    const result = parseSeatRows([
      [
        "Sessoin No",
        "Referance ID",
        "Studnt ID",
        "Seet No",
        "Stage Anouncing Name",
        "Tickt Category",
        "Guest Seat",
      ],
      [3, "J3002", "STU-3002", 702, "Typo Header Student", "B", 701],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      referenceId: "J3002",
      sessionNo: "3",
      studentId: "STU-3002",
      seatNo: "702",
      stageAnnouncingName: "Typo Header Student",
      ticketCategory: "B",
      balconyVisitorSeatNos: ["701"],
    });
  });

  it("reports row-level validation errors without dropping valid rows", () => {
    const result = parseSeatRows([
      [
        "Session No",
        "Reference ID",
        "Student ID",
        "Seat No",
        "Stage Announcing Name",
        "Ticket",
        "Balcony Visitors Seat No",
        "Balcony Visitors Seat No 2",
      ],
      [1, "J2001", "STU-1", 10, "Valid B Student", "B", "Balcony 1", ""],
      [1, "", "STU-2", 11, "Missing Reference", "A", "", ""],
      [1, "J2003", "STU-3", 12, "Wrong C Seats", "C", "Balcony 2", ""],
      [1, "J2004", "STU-4", 13, "Wrong A Seats", "A", "Balcony 3", ""],
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.referenceId).toBe("J2001");
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        message: "Reference ID is required.",
      },
      {
        rowNumber: 4,
        message: "Ticket C requires exactly 2 balcony visitor seat numbers.",
      },
      {
        rowNumber: 5,
        message: "Ticket A must not include balcony visitor seat numbers.",
      },
    ]);
  });

  it("reports missing required columns with corrected field labels", () => {
    const result = parseSeatRows([
      ["Session No", "Reference ID", "Student ID", "Stage Announcing Name", "Ticket"],
      [1, "J4001", "STU-4001", "Missing Seat Student", "A"],
    ]);

    expect(result.errors).toEqual([
      {
        rowNumber: 1,
        message: "Missing required columns: Seat No.",
      },
    ]);
  });

  it("uses corrected wording for missing seat values", () => {
    const result = parseSeatRows([
      [
        "Session No",
        "Reference ID",
        "Student ID",
        "Seat No",
        "Stage Announcing Name",
        "Ticket",
      ],
      [1, "J4002", "STU-4002", "", "Missing Seat Value", "A"],
    ]);

    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        message: "Seat No is required.",
      },
    ]);
  });

  it("maps ticket categories to visitor seat counts", () => {
    expect(ticketVisitorSeatCount("A")).toBe(0);
    expect(ticketVisitorSeatCount("B")).toBe(1);
    expect(ticketVisitorSeatCount("C")).toBe(2);
    expect(() => ticketVisitorSeatCount("D")).toThrow(
      "Ticket must be A, B, or C."
    );
  });
});
