import { MAX_RECEIPT_BYTES } from "@/lib/certificates/constants";

const RECEIPT_TYPES = {
  "image/jpeg": {
    extension: "jpg",
    matches: (bytes: Uint8Array) =>
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    matches: (bytes: Uint8Array) =>
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (byte, index) => bytes[index] === byte
      ),
  },
  "application/pdf": {
    extension: "pdf",
    matches: (bytes: Uint8Array) =>
      [0x25, 0x50, 0x44, 0x46, 0x2d].every(
        (byte, index) => bytes[index] === byte
      ),
  },
} as const;

export type ValidatedReceipt = {
  body: Buffer;
  contentType: keyof typeof RECEIPT_TYPES;
  extension: string;
  originalFileName: string;
  size: number;
};

export class ReceiptValidationError extends Error {}

export async function validateReceipt(file: File): Promise<ValidatedReceipt> {
  if (file.size === 0) {
    throw new ReceiptValidationError("Upload your payment receipt.");
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    throw new ReceiptValidationError("Payment receipt must be 5 MB or smaller.");
  }

  const body = Buffer.from(await file.arrayBuffer());
  const detected = Object.entries(RECEIPT_TYPES).find(([, definition]) =>
    definition.matches(body)
  );

  if (!detected) {
    throw new ReceiptValidationError(
      "Upload a valid JPG, PNG, or PDF payment receipt."
    );
  }

  const [contentType, definition] = detected as [
    keyof typeof RECEIPT_TYPES,
    (typeof RECEIPT_TYPES)[keyof typeof RECEIPT_TYPES],
  ];

  return {
    body,
    contentType,
    extension: definition.extension,
    originalFileName: sanitizeFileName(file.name, definition.extension),
    size: body.length,
  };
}

function sanitizeFileName(fileName: string, extension: string) {
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return `${baseName || "payment-receipt"}.${extension}`;
}
