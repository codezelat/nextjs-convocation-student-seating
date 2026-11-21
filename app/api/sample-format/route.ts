import ExcelJS from "exceljs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SITC Convocation Seating Platform";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Seat Import Format", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Session", key: "session", width: 12 },
    { header: "Reference", key: "reference", width: 16 },
    { header: "Student ID", key: "studentId", width: 34 },
    { header: "Seat No", key: "seatNo", width: 12 },
    { header: "Stage Announcing Name", key: "stageAnnouncingName", width: 34 },
    { header: "Ticket", key: "ticket", width: 10 },
    { header: "Balcony Visitors Seat No", key: "visitorSeat1", width: 24 },
    { header: "Balcony Visitors Seat No 2", key: "visitorSeat2", width: 24 },
    { header: "Program ID", key: "programId", width: 16, style: { numFmt: "@" } },
  ];

  sheet.addRows([
    [1, "J1001", "PSBU/SITC/DIP/SAMPLE/001", 101, "Sample Graduate One", "B", "Balcony 101", "", "PSY"],
    [1, "J1002", "PSBU/SITC/DIP/SAMPLE/002", 102, "Sample Graduate Two", "C", "Balcony 102", "Balcony 103", ""],
  ]);

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF171717" },
  };
  header.alignment = { vertical: "middle" };
  header.height = 22;

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E5E5" } },
      };
      if (rowNumber > 1) {
        cell.alignment = { vertical: "middle" };
      }
    });
  });

  for (let rowNumber = 2; rowNumber <= 200; rowNumber += 1) {
    sheet.getCell(`F${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"A,B,C"'],
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sitc-seat-import-sample.xlsx"',
    },
  });
}
