import ExcelJS from "exceljs";

import { parseSeatRows } from "@/lib/import/seat-workbook";

export async function parseSeatWorkbook(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: "Workbook must include at least one sheet." }],
    };
  }

  const columnCount = Math.max(worksheet.actualColumnCount, 8);
  const rows: unknown[][] = [];

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values: unknown[] = [];
    for (let column = 1; column <= columnCount; column += 1) {
      values.push(normalizeCellValue(row.getCell(column).value));
    }
    rows.push(values);
  });

  return parseSeatRows(rows);
}

function normalizeCellValue(value: ExcelJS.CellValue) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value && value.text) {
      return value.text;
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }

    if ("result" in value && value.result !== undefined) {
      return value.result;
    }
  }

  return value;
}
