import { describe, expect, it } from "vitest";

import { ticketDownloadDisposition } from "@/lib/tickets/filename";

function utf8Name(header: string) {
  return decodeURIComponent(header.split("filename*=UTF-8''")[1]);
}

describe("e-ticket download names", () => {
  it("keeps a multilingual name and includes a compatible ASCII filename", () => {
    const header = ticketDownloadDisposition("නිමල් පෙරේරා", "QA-001");
    expect(header).toContain('filename="SITC E-Ticket - QA-001.pdf"');
    expect(utf8Name(header)).toBe("SITC E-Ticket - නිමල් පෙරේරා.pdf");
  });

  it("safely encodes punctuation and strips controls and filename separators", () => {
    const header = ticketDownloadDisposition("D'Ávila / \\ \r\n \"குமார்\" \u202E", "QA-002");
    expect(header).not.toMatch(/[\r\n]|%0[ad]|%E2%80%AE/iu);
    expect(header).toContain("D%27%C3%81vila");
    expect(utf8Name(header)).toBe("SITC E-Ticket - D'Ávila குமார்.pdf");
  });

  it("keeps complete graphemes within the filename byte limit", () => {
    const grapheme = "👩🏽‍🎓";
    const filename = utf8Name(ticketDownloadDisposition(grapheme.repeat(40), "QA-003"));
    const name = filename.slice("SITC E-Ticket - ".length, -".pdf".length);
    expect(Buffer.byteLength(name)).toBeLessThanOrEqual(180);
    expect(name).toBe(grapheme.repeat(Math.floor(180 / Buffer.byteLength(grapheme))));
  });
});
