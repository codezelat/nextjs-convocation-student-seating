import { stageReceiptTail } from "@/lib/certificates/receipt-chunks";
import { countRecentCertificateRequestsBySource } from "@/lib/data/certificate-requests";
import { getClientSourceHash } from "@/lib/http/rate-limit";
import {
  CertificateSubmissionError,
  submitCertificateRequest,
} from "@/lib/certificates/service";
import {
  parseLimitedFormData,
  RequestBodyTooLargeError,
} from "@/lib/http/form-data";

const maximumRequestBytes = 6 * 1024 * 1024;
const rateLimitWindowMs = 60 * 60 * 1000;
const maximumRequestsPerWindow = 3;

export async function PUT(request: Request) {
  return stageReceiptTail(request, getClientSourceHash(request));
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await parseLimitedFormData(request, maximumRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json(
        { error: "Payment receipt must be 5 MB or smaller." },
        { status: 413 }
      );
    }
    return Response.json({ error: "Invalid form submission." }, { status: 400 });
  }

  if (String(formData.get("website") ?? "").trim()) {
    return Response.json({ ok: true }, { status: 201 });
  }

  const sourceHash = getClientSourceHash(request);
  if (sourceHash) {
    const recentCount = await countRecentCertificateRequestsBySource(
      sourceHash,
      new Date(Date.now() - rateLimitWindowMs)
    );

    if (recentCount >= maximumRequestsPerWindow) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }
  }

  try {
    await submitCertificateRequest(formData, { sourceHash });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof CertificateSubmissionError) {
      return Response.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: error.status }
      );
    }

    console.error("Unexpected certificate request error", error);
    return Response.json(
      { error: "Your request could not be submitted. Please try again." },
      { status: 500 }
    );
  }
}
