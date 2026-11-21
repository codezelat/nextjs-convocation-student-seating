import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import {
  createCertificateRequest,
  findCertificateRequestByStudentId,
} from "@/lib/data/certificate-requests";
import { joinReceiptChunks } from "@/lib/certificates/receipt-chunks";
import { validateReceipt, ReceiptValidationError } from "@/lib/certificates/receipt";
import { certificateRequestFieldsSchema } from "@/lib/certificates/validation";
import { deleteReceipt, uploadReceipt } from "@/lib/storage/receipts";

export class CertificateSubmissionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors?: Record<string, string[] | undefined>
  ) {
    super(message);
  }
}

export async function submitCertificateRequest(
  formData: FormData,
  options: { sourceHash?: string; receiptSource?: string } = {}
) {
  const parsed = certificateRequestFieldsSchema.safeParse({
    studentId: formData.get("studentId"),
    fullName: formData.get("fullName"),
    whatsappNumber: formData.get("whatsappNumber"),
    deliveryAddress: formData.get("deliveryAddress"),
    district: formData.get("district"),
    deliveryContactNumber: formData.get("deliveryContactNumber"),
  });

  if (!parsed.success) {
    throw new CertificateSubmissionError(
      "Please correct the highlighted fields.",
      400,
      parsed.error.flatten().fieldErrors
    );
  }

  if (!isConfirmed(formData.get("confirmation"))) {
    throw new CertificateSubmissionError(
      "Confirm that the information provided is accurate.",
      400,
      { confirmation: ["Confirmation is required."] }
    );
  }

  const existing = await findCertificateRequestByStudentId(parsed.data.studentId);
  if (existing) {
    throw new CertificateSubmissionError(
      "A certificate pack request already exists for this Student ID Number.",
      409,
      { studentId: ["A request already exists for this Student ID Number."] }
    );
  }

  const file = formData.get("receipt");
  if (!(file instanceof File)) {
    throw new CertificateSubmissionError(
      "Upload your payment receipt.",
      400,
      { receipt: ["Payment receipt is required."] }
    );
  }

  const ticket = String(formData.get("receiptTicket") ?? "");
  const combined = await joinReceiptChunks(file, ticket, options.receiptSource ?? options.sourceHash)
    .catch(() => {
      throw new CertificateSubmissionError(
        "The receipt upload expired or could not be read. Please upload it again.",
        400
      );
    });

  let receipt;
  try {
    receipt = await validateReceipt(combined.file);
  } catch (error) {
    if (error instanceof ReceiptValidationError) {
      throw new CertificateSubmissionError(error.message, 400, {
        receipt: [error.message],
      });
    }
    throw error;
  }

  const objectKey = `certificate-requests/${new Date().getUTCFullYear()}/${randomUUID()}.${receipt.extension}`;

  try {
    await uploadReceipt({
      key: objectKey,
      body: receipt.body,
      contentType: receipt.contentType,
      fileName: receipt.originalFileName,
    });
  } catch (error) {
    console.error("Certificate receipt upload failed", error);
    throw new CertificateSubmissionError(
      "The receipt could not be uploaded. Please try again.",
      503
    );
  }

  try {
    const result = await createCertificateRequest({
      ...parsed.data,
      receiptObjectKey: objectKey,
      receiptFileName: receipt.originalFileName,
      receiptContentType: receipt.contentType,
      receiptSizeBytes: receipt.size,
      sourceHash: options.sourceHash,
    });
    if (combined.key) {
      await deleteReceipt(combined.key).catch(() => {});
    }
    return result;
  } catch (error) {
    await deleteReceipt(objectKey).catch((cleanupError) => {
      console.error("Certificate receipt cleanup failed", cleanupError);
    });

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new CertificateSubmissionError(
        "A certificate pack request already exists for this Student ID Number.",
        409,
        { studentId: ["A request already exists for this Student ID Number."] }
      );
    }

    console.error("Certificate request database write failed", error);
    throw new CertificateSubmissionError(
      "Your request could not be saved. Please try again.",
      500
    );
  }
}

function isConfirmed(value: FormDataEntryValue | null) {
  return value === "true" || value === "on" || value === "1";
}
