import { describe, expect, it } from "vitest";

import { MAX_RECEIPT_BYTES } from "@/lib/certificates/constants";
import {
  ReceiptValidationError,
  validateReceipt,
} from "@/lib/certificates/receipt";
import { certificateRequestFieldsSchema } from "@/lib/certificates/validation";

const validFields = {
  studentId: "sitc/2026/001",
  fullName: "A. B. Perera",
  whatsappNumber: "077 123 4567",
  deliveryAddress: "12, Main Street, Colombo 07",
  district: "Colombo",
  deliveryContactNumber: "+94 11 234 5678",
};

describe("certificate request validation", () => {
  it("normalizes student ID and Sri Lankan phone numbers", () => {
    const result = certificateRequestFieldsSchema.parse(validFields);

    expect(result.studentId).toBe("SITC/2026/001");
    expect(result.whatsappNumber).toBe("+94771234567");
    expect(result.deliveryContactNumber).toBe("+94112345678");
  });

  it("accepts Unicode graduate names", () => {
    const result = certificateRequestFieldsSchema.safeParse({
      ...validFields,
      fullName: "නිමාලි පෙරේරා",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a district outside the official list", () => {
    const result = certificateRequestFieldsSchema.safeParse({
      ...validFields,
      district: "Western",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-mobile WhatsApp number", () => {
    const result = certificateRequestFieldsSchema.safeParse({
      ...validFields,
      whatsappNumber: "0112345678",
    });

    expect(result.success).toBe(false);
  });
});

describe("payment receipt validation", () => {
  it("detects a PNG by its binary signature", async () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const receipt = await validateReceipt(
      new File([bytes], "receipt.png", { type: "image/png" })
    );

    expect(receipt.contentType).toBe("image/png");
    expect(receipt.originalFileName).toBe("receipt.png");
  });

  it("uses detected content rather than the claimed MIME type", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    const receipt = await validateReceipt(
      new File([pdf], "receipt.jpg", { type: "image/jpeg" })
    );

    expect(receipt.contentType).toBe("application/pdf");
    expect(receipt.originalFileName).toBe("receipt.pdf");
  });

  it("rejects files with an unsupported binary signature", async () => {
    const file = new File(["not an image"], "receipt.png", {
      type: "image/png",
    });

    await expect(validateReceipt(file)).rejects.toBeInstanceOf(
      ReceiptValidationError
    );
  });

  it("rejects files larger than the configured limit", async () => {
    const file = new File(
      [new Uint8Array(MAX_RECEIPT_BYTES + 1)],
      "receipt.pdf",
      { type: "application/pdf" }
    );

    await expect(validateReceipt(file)).rejects.toThrow("5 MB or smaller");
  });
});
