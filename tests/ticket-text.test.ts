import { Canvas } from "skia-canvas";
import { expect, it, vi } from "vitest";

import { drawTicketText } from "@/lib/tickets/text";

vi.mock("server-only", () => ({}));

it("advances Sinhala pre-base vowel signs so they do not overlap the consonant", () => {
  const canvas = new Canvas(300, 80, { gpu: false });
  try {
    const ctx = canvas.getContext("2d");
    drawTicketText(ctx, "බොරළු පෙරේරා", { x: 0, y: 0, width: 300, height: 80, fontSize: 37 });

    const baseWidth = ctx.measureText("බ").width;
    expect(ctx.measureText("බෙ").width).toBeGreaterThan(baseWidth + 8);
    expect(ctx.measureText("බො").width).toBeGreaterThan(baseWidth + 8);
  } finally {
    canvas.dispose();
  }
});
