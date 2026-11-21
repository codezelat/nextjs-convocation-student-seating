const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const filenamePrefix = "SITC E-Ticket - ";
const filenameExtension = ".pdf";

function filenamePart(value: string) {
  return value
    .toWellFormed()
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\p{Cc}\p{Bidi_Control}]/gu, " ")
    .replace(/\s+/gu, " ")
    .replace(/^[. ]+|[. ]+$/gu, "");
}

function limitFilenamePart(value: string) {
  let bytes = 0;
  let name = "";
  for (const { segment } of graphemes.segment(value)) {
    bytes += Buffer.byteLength(segment);
    if (bytes > 180) break;
    name += segment;
  }
  return name.replace(/[. ]+$/u, "");
}

function asciiFilenamePart(value: string) {
  const ascii = value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9 ._'-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return /[A-Za-z0-9]/u.test(ascii) ? ascii : "";
}

export function ticketDownloadDisposition(studentName: string, referenceId: string) {
  const fallback = asciiFilenamePart(filenamePart(referenceId)) || "Convocation 2026";
  const name = limitFilenamePart(filenamePart(studentName)) || fallback;
  const ascii = limitFilenamePart(asciiFilenamePart(name) || fallback);
  const filename = `${filenamePrefix}${name}${filenameExtension}`;
  const encoded = encodeURIComponent(filename).replace(/['()*]/gu, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `attachment; filename="${filenamePrefix}${ascii}${filenameExtension}"; filename*=UTF-8''${encoded}`;
}
