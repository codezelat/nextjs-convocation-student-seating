import "server-only";

import { join } from "node:path";

import { Canvas, FontLibrary, loadImage, type CanvasRenderingContext2D } from "skia-canvas";

import type { PublicSeatResult } from "@/lib/data/seats";

const assetDirectory = join(process.cwd(), "lib/tickets/assets");
const fontDirectory = join(assetDirectory, "fonts");

// Positions are measured against the supplied 1410 × 2000 ticket artwork.
const templateWidth = 1410;
const templateHeight = 2000;
const pointsPerMillimetre = 72 / 25.4;
const pageWidth = 148 * pointsPerMillimetre;
const pageHeight = 210 * pointsPerMillimetre;
const scale = Math.min(pageWidth / templateWidth, pageHeight / templateHeight);
const ink = "#0b233c";
const burgundy = "#790f2f";
const registerFonts = FontLibrary.use.bind(FontLibrary);

const supplementalScripts = [
  "Arabic", "Armenian", "Bengali", "Devanagari", "Ethiopic", "Georgian", "Gujarati",
  "Gurmukhi", "Hebrew", "Kannada", "Khmer", "Lao", "Malayalam", "Myanmar", "Oriya",
  "Symbols2", "Tamil", "Telugu", "Thai",
] as const;
const eastAsianText = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u;
const baseFamilies = [
  '"Ticket Sans"',
  '"Ticket Sinhala"',
  ...supplementalScripts.map((script) => `"Ticket ${script}"`),
];

let templatePromise: ReturnType<typeof loadImage> | undefined;

function loadTemplate() {
  if (!templatePromise) {
    registerFonts({
      "Ticket Sans": ["NotoSans-Regular.ttf", "NotoSans-SemiBold.ttf"].map((name) => join(fontDirectory, name)),
      "Ticket Sinhala": ["Regular", "Bold"].map((weight) =>
        join(process.cwd(), "public/fonts", `NotoSansSinhala-${weight}.ttf`)
      ),
      ...Object.fromEntries(supplementalScripts.map((script) =>
        [`Ticket ${script}`, join(fontDirectory, `NotoSans${script}-Regular.ttf`)]
      )),
    });
    templatePromise = loadImage(join(assetDirectory, "template.jpg"));
  }
  return templatePromise;
}

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align?: "left" | "center";
  color?: string;
  weight?: number;
};

function cleanText(value: string) {
  return value.toWellFormed().normalize("NFC").replace(/[\p{Cc}\s]+/gu, " ").trim();
}

function drawField(ctx: CanvasRenderingContext2D, value: string, box: Box) {
  const text = cleanText(value);
  if (!text) return;

  const cjk = eastAsianText.test(text);
  if (cjk && !FontLibrary.has("Ticket CJK")) {
    registerFonts("Ticket CJK", join(fontDirectory, "NotoSansCJK-Regular.otf"));
  }
  const families = (cjk ? [...baseFamilies, '"Ticket CJK"', "sans-serif"] : [...baseFamilies, "sans-serif"]).join(", ");
  const firstLetter = text.match(/\p{L}/u)?.[0] ?? "";
  ctx.direction = /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(firstLetter) ? "rtl" : "ltr";
  ctx.textAlign = box.align ?? "left";
  ctx.fillStyle = box.color ?? ink;

  // Skia measures the shaped text and uses the same Unicode line breaks when drawing.
  for (let size = box.fontSize; size >= 1; size -= 1) {
    ctx.font = `${box.weight ?? 600} ${size}px/${size * 1.14}px ${families}`;
    const metrics = ctx.measureText(text, box.width);
    const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    if (metrics.width > box.width || inkHeight > box.height) continue;

    const x = box.align === "center" ? box.x + box.width / 2 : box.x;
    const y = box.y + (box.height - inkHeight) / 2 + metrics.actualBoundingBoxAscent;
    ctx.fillText(text, x, y, box.width);
    return;
  }
}

function visitorSeatLabel(seat: string) {
  return /\bbalcony\b/iu.test(seat) ? seat : `Balcony ${seat}`;
}

export async function renderETicket(seat: PublicSeatResult) {
  const template = await loadTemplate();
  const canvas = new Canvas(pageWidth, pageHeight, { gpu: false });
  const ctx = canvas.getContext("2d");

  ctx.translate((pageWidth - templateWidth * scale) / 2, (pageHeight - templateHeight * scale) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(template, 0, 0, templateWidth, templateHeight);
  ctx.textWrap = true;

  const visitorSeats = seat.balconyVisitorSeatNos.map(cleanText).filter(Boolean);
  drawField(ctx, seat.studentId, { x: 157, y: 631, width: 298, height: 72, fontSize: 26 });
  drawField(ctx, String(visitorSeats.length), { x: 600, y: 629, width: 168, height: 57, fontSize: 39, align: "center" });
  drawField(ctx, `Category ${seat.ticketCategory}`, { x: 810, y: 629, width: 237, height: 57, fontSize: 33, align: "center" });
  const session = seat.sessionNo.replace(/^session\b(?:\s+no\.?(?=\s|[:#-]))?\s*[:#-]?\s*/iu, "").trim();
  drawField(ctx, session || seat.sessionNo, {
    x: 1081, y: 592, width: 210, height: 106, fontSize: 101, align: "center", color: "#ffffff", weight: 700,
  });
  drawField(ctx, seat.programId || "-", {
    x: 1106, y: 724, width: 162, height: 42, fontSize: 29, align: "center", color: burgundy,
  });
  drawField(ctx, seat.seatNo, { x: 303, y: 825, width: 303, height: 83, fontSize: 45 });
  drawField(ctx, visitorSeats.map(visitorSeatLabel).join("  ·  ") || "No visitor seats", {
    x: 802, y: 825, width: 453, height: 83, fontSize: 35,
  });

  drawField(ctx, "According to PSB University Database", {
    x: 490, y: 1615, width: 757, height: 55, fontSize: 33,
  });
  drawField(ctx, seat.stageAnnouncingName, { x: 490, y: 1714, width: 757, height: 69, fontSize: 37 });
  drawField(ctx, `Ref. ${seat.referenceId}`, {
    x: 148, y: 1784, width: 214, height: 32, fontSize: 19, align: "center",
  });

  try {
    return await canvas.toBuffer("pdf", { quality: 0.92 });
  } finally {
    canvas.dispose();
  }
}
