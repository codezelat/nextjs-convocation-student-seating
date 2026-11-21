import "server-only";

import { join } from "node:path";

import { Canvas, loadImage } from "skia-canvas";

import type { PublicSeatResult } from "@/lib/data/seats";
import { cleanTicketText, drawTicketText } from "@/lib/tickets/text";

// Positions are measured against the supplied 1410 × 2000 ticket artwork.
const templateWidth = 1410;
const templateHeight = 2000;
const pointsPerMillimetre = 72 / 25.4;
const pageWidth = 148 * pointsPerMillimetre;
const pageHeight = 210 * pointsPerMillimetre;
const scale = Math.min(pageWidth / templateWidth, pageHeight / templateHeight);
const burgundy = "#790f2f";

let templatePromise: ReturnType<typeof loadImage> | undefined;

function visitorSeatLabel(seat: string) {
  return /\bbalcony\b/iu.test(seat) ? seat : `Balcony ${seat}`;
}

export async function renderETicket(seat: PublicSeatResult) {
  templatePromise ??= loadImage(join(process.cwd(), "lib/tickets/assets/template.jpg"));
  const template = await templatePromise;
  const canvas = new Canvas(pageWidth, pageHeight, { gpu: false });
  const ctx = canvas.getContext("2d");

  ctx.translate((pageWidth - templateWidth * scale) / 2, (pageHeight - templateHeight * scale) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(template, 0, 0, templateWidth, templateHeight);

  const visitorSeats = seat.balconyVisitorSeatNos.map(cleanTicketText).filter(Boolean);
  drawTicketText(ctx, seat.studentId, { x: 157, y: 631, width: 298, height: 72, fontSize: 26 });
  drawTicketText(ctx, String(visitorSeats.length), { x: 600, y: 629, width: 168, height: 57, fontSize: 39, align: "center" });
  drawTicketText(ctx, `Category ${seat.ticketCategory}`, { x: 810, y: 629, width: 237, height: 57, fontSize: 33, align: "center" });
  const session = seat.sessionNo.replace(/^session\b(?:\s+no\.?(?=\s|[:#-]))?\s*[:#-]?\s*/iu, "").trim();
  drawTicketText(ctx, session || seat.sessionNo, {
    x: 1081, y: 592, width: 210, height: 106, fontSize: 101, align: "center", color: "#ffffff", weight: 700,
  });
  drawTicketText(ctx, seat.programId || "-", {
    x: 1106, y: 724, width: 162, height: 42, fontSize: 29, align: "center", color: burgundy,
  });
  drawTicketText(ctx, seat.seatNo, { x: 303, y: 825, width: 303, height: 83, fontSize: 45 });
  drawTicketText(ctx, visitorSeats.map(visitorSeatLabel).join("  ·  ") || "No visitor seats", {
    x: 802, y: 825, width: 453, height: 83, fontSize: 35,
  });

  drawTicketText(ctx, "According to PSB University Database", {
    x: 490, y: 1615, width: 757, height: 55, fontSize: 33,
  });
  drawTicketText(ctx, seat.stageAnnouncingName, { x: 490, y: 1714, width: 757, height: 69, fontSize: 37 });
  drawTicketText(ctx, `Ref. ${seat.referenceId}`, {
    x: 148, y: 1784, width: 214, height: 32, fontSize: 19, align: "center",
  });

  try {
    return await canvas.toBuffer("pdf", { quality: 0.92 });
  } finally {
    canvas.dispose();
  }
}
