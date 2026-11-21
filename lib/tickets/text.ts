import "server-only";

import { join } from "node:path";

import { FontLibrary, type CanvasRenderingContext2D } from "skia-canvas";

const fontDirectory = join(process.cwd(), "lib/tickets/assets/fonts");
const publicFonts = join(process.cwd(), "public/fonts");
const registerFonts = FontLibrary.use.bind(FontLibrary);

const supplementalScripts = [
  "Arabic", "Armenian", "Bengali", "Devanagari", "Ethiopic", "Georgian", "Gujarati",
  "Gurmukhi", "Hebrew", "Kannada", "Khmer", "Lao", "Malayalam", "Myanmar", "Oriya",
  "Symbols2", "Telugu", "Thai",
] as const;
const eastAsianText = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u;
const baseFamilies = [
  "Ticket Sans",
  "Ticket Sinhala",
  "Ticket Tamil",
  ...supplementalScripts.map((script) => `Ticket ${script}`),
];

function loadFonts() {
  if (FontLibrary.has("Ticket Sans")) return;
  registerFonts({
    "Ticket Sans": ["NotoSans-Regular.ttf", "NotoSans-SemiBold.ttf"].map((name) => join(fontDirectory, name)),
    "Ticket Sinhala": ["Regular", "Bold"].map((weight) => join(publicFonts, `NotoSansSinhala-${weight}.ttf`)),
    "Ticket Tamil": join(publicFonts, "NotoSansTamil-Regular.ttf"),
    ...Object.fromEntries(supplementalScripts.map((script) =>
      [`Ticket ${script}`, join(fontDirectory, `NotoSans${script}-Regular.ttf`)]
    )),
  });
}

type TextBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align?: "left" | "center";
  color?: string;
  weight?: number;
};

export function cleanTicketText(value: string) {
  return value.toWellFormed().normalize("NFC").replace(/[\p{Cc}\s]+/gu, " ").trim();
}

export function drawTicketText(ctx: CanvasRenderingContext2D, value: string, box: TextBox) {
  const text = cleanTicketText(value);
  if (!text) return;

  loadFonts();
  const cjk = eastAsianText.test(text);
  if (cjk && !FontLibrary.has("Ticket CJK")) {
    registerFonts("Ticket CJK", join(fontDirectory, "NotoSansCJK-Regular.otf"));
  }
  const firstLetter = text.match(/\p{L}/u)?.[0] ?? "";
  // Matching the primary script also gives its word spaces the correct metrics.
  const primaryFamily = /\p{Script=Sinhala}/u.test(firstLetter) ? "Ticket Sinhala"
    : /\p{Script=Tamil}/u.test(firstLetter) ? "Ticket Tamil"
    : "Ticket Sans";
  const families = [
    primaryFamily,
    ...baseFamilies.filter((family) => family !== primaryFamily),
    ...(cjk ? ["Ticket CJK"] : []),
  ].map((family) => `"${family}"`).concat("sans-serif").join(", ");

  ctx.direction = /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(firstLetter) ? "rtl" : "ltr";
  ctx.textAlign = box.align ?? "left";
  ctx.fillStyle = box.color ?? "#0b233c";
  ctx.textWrap = true;

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
