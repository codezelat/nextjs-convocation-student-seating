export type TicketCategory = "A" | "B" | "C";

export type SeatImportRow = {
  referenceId: string;
  sessionNo: string;
  studentId: string;
  seatNo: string;
  stageAnnouncingName: string;
  ticketCategory: TicketCategory;
  balconyVisitorSeatNos: string[];
};

export type SeatImportError = {
  rowNumber: number;
  message: string;
};

export type SeatImportResult = {
  rows: SeatImportRow[];
  errors: SeatImportError[];
};

type ColumnMap = {
  sessionNo?: number;
  referenceId?: number;
  studentId?: number;
  seatNo?: number;
  stageAnnouncingName?: number;
  ticketCategory?: number;
  visitorSeatIndexes: number[];
};

type RequiredColumn = keyof Omit<ColumnMap, "visitorSeatIndexes">;

const requiredColumns: RequiredColumn[] = [
  "sessionNo",
  "referenceId",
  "studentId",
  "seatNo",
  "stageAnnouncingName",
  "ticketCategory",
];

const columnLabels: Record<RequiredColumn, string> = {
  sessionNo: "Session No",
  referenceId: "Reference ID",
  studentId: "Student ID",
  seatNo: "Seat No",
  stageAnnouncingName: "Stage Announcing Name",
  ticketCategory: "Ticket",
};

const headerAliases: Record<RequiredColumn, string[]> = {
  sessionNo: ["session", "sessioncode"],
  referenceId: ["reference", "ref", "refcode", "referencecode", "referrence"],
  studentId: [
    "student",
    "studentcode",
    "studentregistration",
    "registration",
    "reg",
    "studentreg",
    "regno",
    "index",
  ],
  seatNo: ["seat", "seet", "seatcode", "seetcode", "set"],
  stageAnnouncingName: [
    "stageannouncingname",
    "stageannouncementname",
    "stageanouncingname",
    "announcingname",
    "anouncingname",
    "stagename",
    "graduatename",
    "studentname",
    "name",
  ],
  ticketCategory: [
    "ticket",
    "tickt",
    "ticketcategory",
    "tickettype",
    "ticketcat",
    "category",
  ],
};

const headerStopWords = new Set(["id", "no", "n", "number", "num"]);

export function ticketVisitorSeatCount(value: string): 0 | 1 | 2 {
  const ticket = value.trim().toUpperCase();

  if (ticket === "A") {
    return 0;
  }

  if (ticket === "B") {
    return 1;
  }

  if (ticket === "C") {
    return 2;
  }

  throw new Error("Ticket must be A, B, or C.");
}

export function parseSeatRows(rawRows: unknown[][]): SeatImportResult {
  if (rawRows.length < 2) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: "Workbook must include a header row and at least one student row." }],
    };
  }

  const header = rawRows[0] ?? [];
  const columns = buildColumnMap(header);
  const missingColumns = requiredColumns.filter((column) => columns[column] === undefined);

  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Missing required columns: ${missingColumns
            .map((column) => columnLabels[column])
            .join(", ")}.`,
        },
      ],
    };
  }

  const rows: SeatImportRow[] = [];
  const errors: SeatImportError[] = [];

  rawRows.slice(1).forEach((rawRow, offset) => {
    const rowNumber = offset + 2;

    if (isBlankRow(rawRow)) {
      return;
    }

    const row = parseSingleRow(rawRow, columns as Required<ColumnMap>);
    if (isNonStudentNoteRow(row)) {
      return;
    }

    const validationError = validateSeatRow(row);

    if (validationError) {
      errors.push({ rowNumber, message: validationError });
      return;
    }

    rows.push(row);
  });

  return { rows, errors };
}

function buildColumnMap(header: unknown[]): ColumnMap {
  const columns: ColumnMap = {
    visitorSeatIndexes: [],
  };

  header.forEach((cell, index) => {
    const normalized = normalizeHeader(toCellText(cell));

    for (const column of requiredColumns) {
      if (
        columns[column] === undefined &&
        isHeaderMatch(normalized, headerAliases[column])
      ) {
        columns[column] = index;
        return;
      }
    }

    if (isVisitorSeatHeader(normalized)) {
      columns.visitorSeatIndexes.push(index);
    }
  });

  const firstVisitorSeatIndex = columns.visitorSeatIndexes[0];
  if (firstVisitorSeatIndex !== undefined) {
    const nextIndex = firstVisitorSeatIndex + 1;
    const nextHeader = normalizeHeader(toCellText(header[nextIndex]));

    if (!nextHeader || nextHeader.includes("balcony")) {
      columns.visitorSeatIndexes = [
        ...new Set([...columns.visitorSeatIndexes, nextIndex]),
      ];
    }
  }

  return columns;
}

function parseSingleRow(rawRow: unknown[], columns: Required<ColumnMap>): SeatImportRow {
  const ticketCategory = toCellText(rawRow[columns.ticketCategory]).toUpperCase();

  return {
    referenceId: toCellText(rawRow[columns.referenceId]),
    sessionNo: toCellText(rawRow[columns.sessionNo]),
    studentId: toCellText(rawRow[columns.studentId]),
    seatNo: toCellText(rawRow[columns.seatNo]),
    stageAnnouncingName: toCellText(rawRow[columns.stageAnnouncingName]),
    ticketCategory: ticketCategory as TicketCategory,
    balconyVisitorSeatNos: columns.visitorSeatIndexes
      .map((index) => toCellText(rawRow[index]))
      .filter(Boolean),
  };
}

function validateSeatRow(row: SeatImportRow): string | null {
  if (!row.referenceId) {
    return "Reference ID is required.";
  }

  if (!row.sessionNo) {
    return "Session No is required.";
  }

  if (!row.studentId) {
    return "Student ID is required.";
  }

  if (!row.seatNo) {
    return "Seat No is required.";
  }

  if (!row.stageAnnouncingName) {
    return "Stage Announcing Name is required.";
  }

  let expectedVisitorSeats: number;
  try {
    expectedVisitorSeats = ticketVisitorSeatCount(row.ticketCategory);
  } catch (error) {
    return error instanceof Error ? error.message : "Ticket must be A, B, or C.";
  }

  if (expectedVisitorSeats === 0 && row.balconyVisitorSeatNos.length > 0) {
    return "Ticket A must not include balcony visitor seat numbers.";
  }

  if (
    expectedVisitorSeats > 0 &&
    row.balconyVisitorSeatNos.length !== expectedVisitorSeats
  ) {
    return `Ticket ${row.ticketCategory} requires exactly ${expectedVisitorSeats} balcony visitor seat number${expectedVisitorSeats === 1 ? "" : "s"}.`;
  }

  return null;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part && !headerStopWords.has(part))
    .join("");
}

function isHeaderMatch(normalized: string, aliases: string[]) {
  return aliases.some((alias) => isCloseHeader(normalized, alias));
}

function isCloseHeader(normalized: string, alias: string) {
  if (normalized === alias) {
    return true;
  }

  if (normalized.length < 4 || alias.length < 4) {
    return false;
  }

  const lengthGap = Math.abs(normalized.length - alias.length);
  const threshold = Math.max(normalized.length, alias.length) >= 6 ? 2 : 1;

  return lengthGap <= threshold && editDistance(normalized, alias) <= threshold;
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function isVisitorSeatHeader(normalized: string) {
  const hasVisitorTerm =
    normalized.includes("visitor") || normalized.includes("guest");
  const hasSeatTerm = normalized.includes("seat") || normalized.includes("seet");

  return hasSeatTerm && (hasVisitorTerm || normalized.includes("balcony"));
}

function toCellText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && "text" in value) {
    return String(value.text ?? "").trim();
  }

  return String(value).trim();
}

function isBlankRow(row: unknown[]) {
  return row.every((cell) => !toCellText(cell));
}

function isNonStudentNoteRow(row: SeatImportRow) {
  return (
    !row.referenceId &&
    !row.studentId &&
    !row.seatNo &&
    !row.ticketCategory &&
    row.stageAnnouncingName
  );
}
