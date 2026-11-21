import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_RECEIPT_BYTES, RECEIPT_FIRST_CHUNK_BYTES } from "@/lib/certificates/constants";
import { joinReceiptChunks, stageReceiptTail } from "@/lib/certificates/receipt-chunks";
import { validateReceipt } from "@/lib/certificates/receipt";
import { getReceiptBytes, uploadReceipt } from "@/lib/storage/receipts";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage/receipts", () => ({
  getReceiptBytes: vi.fn(),
  uploadReceipt: vi.fn(),
}));

function upload(bytes: Uint8Array<ArrayBuffer>) {
  const data = new FormData();
  data.set("tail", new Blob([bytes]), "fragment");
  return new Request("https://example.invalid/api/public/certificate-requests", {
    method: "PUT",
    body: data,
  });
}

describe("receipt uploads across Vercel request bodies", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-only-secret-with-more-than-32-characters");
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reassembles and validates a receipt at the original 5 MB limit", async () => {
    const tail = new Uint8Array(MAX_RECEIPT_BYTES - RECEIPT_FIRST_CHUNK_BYTES);
    tail[tail.length - 1] = 47;
    const response = await stageReceiptTail(upload(tail), "student-source");
    expect(response.status).toBe(201);
    const { ticket } = await response.json() as { ticket: string };

    const bytes = new Uint8Array(RECEIPT_FIRST_CHUNK_BYTES);
    bytes.set(new TextEncoder().encode("%PDF-"));
    const first = new File([bytes], "original.pdf", { type: "application/pdf" });
    vi.mocked(getReceiptBytes).mockResolvedValue(tail);

    const joined = await joinReceiptChunks(first, ticket, "student-source");
    const receipt = await validateReceipt(joined.file);

    expect(receipt.size).toBe(MAX_RECEIPT_BYTES);
    expect(receipt.originalFileName).toBe("original.pdf");
    expect(receipt.body.at(-1)).toBe(47);
    expect(uploadReceipt).toHaveBeenCalledWith(expect.objectContaining({ key: joined.key }));
    await expect(joinReceiptChunks(first, ticket, "different-source")).rejects.toThrow("Invalid staged receipt");
  });

  it("rejects an oversized second fragment before any storage write", async () => {
    const tail = new Uint8Array(MAX_RECEIPT_BYTES - RECEIPT_FIRST_CHUNK_BYTES + 1);
    const response = await stageReceiptTail(upload(tail), "oversize-source");
    expect(response.status).toBe(400);
    expect(uploadReceipt).not.toHaveBeenCalled();
  });
});
