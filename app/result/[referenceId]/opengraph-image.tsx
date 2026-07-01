import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { findSeatByReference } from "@/lib/data/seats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "SITC Convocation 2026 seating pass";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ referenceId: string }>;
};

type FontData = {
  regular: string;
  bold: string;
};

let fontDataPromise: Promise<FontData> | undefined;

export default async function Image({ params }: ImageProps) {
  const { referenceId } = await params;
  const seat = await findSeatByReference(decodeURIComponent(referenceId));
  const visitorSeats = seat?.balconyVisitorSeatNos.map(formatBalconySeat) ?? [];
  const stageName = formatStageName(seat?.stageAnnouncingName);
  const stageNameLines = wrapText(stageName, 35, 2);
  const stageNameSize = splitGraphemes(stageName).length > 52 ? 30 : 35;
  const fonts = await getFontData();
  const svg = renderTicketSvg({
    fonts,
    referenceId: seat?.referenceId ?? referenceId.toUpperCase(),
    sessionNo: seat?.sessionNo ?? "-",
    ticket: seat ? `Category ${seat.ticketCategory}` : "-",
    seatNo: seat?.seatNo ?? "--",
    visitorSeats,
    stageNameLines,
    stageNameSize,
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

async function getFontData() {
  fontDataPromise ??= Promise.all([
    readFile(join(process.cwd(), "public/fonts/NotoSansSinhala-Regular.ttf")),
    readFile(join(process.cwd(), "public/fonts/NotoSansSinhala-Bold.ttf")),
  ]).then(([regular, bold]) => ({
    regular: regular.toString("base64"),
    bold: bold.toString("base64"),
  }));

  return fontDataPromise;
}

function renderTicketSvg({
  fonts,
  referenceId,
  sessionNo,
  ticket,
  seatNo,
  visitorSeats,
  stageNameLines,
  stageNameSize,
}: {
  fonts: FontData;
  referenceId: string;
  sessionNo: string;
  ticket: string;
  seatNo: string;
  visitorSeats: string[];
  stageNameLines: string[];
  stageNameSize: number;
}) {
  const nameTspans = stageNameLines
    .map(
      (line, index) =>
        `<tspan x="130" dy="${index === 0 ? 0 : stageNameSize + 8}">${escapeXml(line)}</tspan>`
    )
    .join("");
  const visitorSeatNodes =
    visitorSeats.length > 0
      ? visitorSeats
          .map(
            (visitorSeat, index) => `
              <g transform="translate(838 ${263 + index * 64})">
                <rect width="176" height="52" rx="26" fill="#2c2c2c" stroke="#5f5f5f"/>
                <text x="18" y="34" class="visitor">${escapeXml(visitorSeat)}</text>
              </g>`
          )
          .join("")
      : `
        <g transform="translate(838 263)">
          <rect width="175" height="52" rx="26" fill="#2c2c2c" stroke="#5f5f5f"/>
          <text x="18" y="34" class="visitor">Graduate only</text>
        </g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <defs>
    <style>
      @font-face {
        font-family: NotoSinhala;
        src: url(data:font/truetype;base64,${fonts.regular}) format('truetype');
        font-weight: 400;
      }
      @font-face {
        font-family: NotoSinhala;
        src: url(data:font/truetype;base64,${fonts.bold}) format('truetype');
        font-weight: 700;
      }
      text { font-family: NotoSinhala, Arial, sans-serif; }
      .eyebrow { fill: #737373; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; }
      .small { fill: #737373; font-size: 17px; font-weight: 700; letter-spacing: 1.5px; }
      .white-small { fill: #a3a3a3; font-size: 17px; font-weight: 700; letter-spacing: 1.5px; }
      .white-number { fill: #ffffff; font-size: 78px; font-weight: 700; }
      .muted-copy { fill: #a3a3a3; font-size: 18px; font-weight: 700; }
      .value { font-size: 24px; font-weight: 700; }
      .visitor { fill: #ffffff; font-size: 24px; font-weight: 700; }
    </style>
    <filter id="shadow" x="-8%" y="-12%" width="116%" height="130%">
      <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#171717" flood-opacity="0.13"/>
    </filter>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M 54 0 L 0 0 0 54" fill="none" stroke="#dddddd" stroke-width="1"/>
    </pattern>
    <clipPath id="ticketClip">
      <rect x="54" y="54" width="1092" height="522" rx="34"/>
    </clipPath>
  </defs>

  <rect width="1200" height="630" fill="#f7f7f7"/>
  <g filter="url(#shadow)">
    <rect x="54" y="54" width="1092" height="522" rx="34" fill="#ffffff" stroke="#dfdfdf"/>
  </g>
  <g clip-path="url(#ticketClip)">
    <rect x="54" y="54" width="744" height="522" fill="#ffffff"/>
    <rect x="54" y="54" width="744" height="522" fill="url(#grid)" opacity="0.72"/>
    <rect x="797" y="54" width="349" height="522" fill="#171717"/>
    <line x1="797" y1="54" x2="797" y2="576" stroke="#d4d4d4" stroke-width="2" stroke-dasharray="12 12"/>
  </g>

  <text x="108" y="131" font-size="26" font-weight="700" letter-spacing="1">SITC CAMPUS</text>
  <text x="108" y="237" font-size="62" font-weight="700">Convocation 2026</text>
  <text x="108" y="286" font-size="30" font-weight="700" fill="#525252">Seating Platform</text>

  <rect x="108" y="312" width="620" height="132" rx="22" fill="#ffffff" fill-opacity="0.88" stroke="#e5e5e5"/>
  <text x="130" y="348" class="eyebrow">STAGE ANNOUNCING NAME</text>
  <text x="130" y="387" font-size="${stageNameSize}" font-weight="700">${nameTspans}</text>

  ${renderTicketBlock(108, "REFERENCE", referenceId)}
  ${renderTicketBlock(272, "SESSION", sessionNo)}
  ${renderTicketBlock(434, "TICKET", ticket, 168)}

  <text x="838" y="121" class="white-small">GRADUATE SEAT</text>
  <text x="838" y="196" class="white-number">${escapeXml(seatNo)}</text>
  <text x="838" y="246" class="white-small">VISITOR SEATS</text>
  ${visitorSeatNodes}

  <g transform="translate(838 451)">
    ${Array.from({ length: 8 })
      .map(
        (_, index) =>
          `<rect x="${index * 26}" y="0" width="18" height="18" fill="${index % 2 === 0 ? "#ffffff" : "#737373"}"/>`
      )
      .join("")}
  </g>
  <text x="838" y="497" class="muted-copy">Open the link to view the</text>
  <text x="838" y="521" class="muted-copy">full seating details.</text>
</svg>`;
}

function renderTicketBlock(
  x: number,
  label: string,
  value: string,
  width = 145
) {
  return `
    <g transform="translate(${x} 444)">
      <rect width="${width}" height="92" rx="18" fill="#ffffff" fill-opacity="0.82" stroke="#e5e5e5"/>
      <text x="18" y="32" class="eyebrow">${escapeXml(label)}</text>
      <text x="18" y="68" class="value">${escapeXml(value)}</text>
    </g>`;
}

function formatBalconySeat(value: string) {
  return value.trim().toLowerCase().startsWith("balcony")
    ? value
    : `Balcony ${value}`;
}

function formatStageName(value?: string) {
  const fallback = "Seat holder";
  const trimmed = value?.trim() || fallback;
  const graphemes = splitGraphemes(trimmed);
  const maxLength = 68;

  if (graphemes.length <= maxLength) {
    return trimmed;
  }

  return `${graphemes.slice(0, maxLength - 1).join("").trim()}...`;
}

function wrapText(value: string, maxGraphemes: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (splitGraphemes(next).length <= maxGraphemes) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [value];
}

function splitGraphemes(value: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("si", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (segment) => segment.segment);
  }

  return Array.from(value);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
