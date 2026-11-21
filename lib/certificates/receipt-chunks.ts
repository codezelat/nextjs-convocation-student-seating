import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

import { MAX_RECEIPT_BYTES, RECEIPT_FIRST_CHUNK_BYTES } from "./constants";
import { getReceiptBytes, uploadReceipt } from "@/lib/storage/receipts";
import { parseLimitedFormData } from "@/lib/http/form-data";
import { rateLimit } from "@/lib/http/rate-limit";

const maxTailBytes = MAX_RECEIPT_BYTES - RECEIPT_FIRST_CHUNK_BYTES;
const chunkPrefix = "pending-certificate-receipts/";
const issuer = "sitc-receipt-chunk";

function digest(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function signingKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Session secret is not configured.");
  return new TextEncoder().encode(secret);
}

export async function stageReceiptTail(request: Request, source: string | undefined) {
  if (!source) return Response.json({ error: "Unable to start the receipt upload." }, { status: 400 });

  const limited = rateLimit(`receipt-tail:${source}`, { limit: 6, windowMs: 60 * 60 * 1000 });
  if (!limited.success) {
    return Response.json({ error: "Too many upload attempts. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });
  }

  const form = await parseLimitedFormData(request, maxTailBytes + 16 * 1024).catch(() => null);
  const tail = form?.get("tail");
  if (!(tail instanceof File) || tail.size < 1 || tail.size > maxTailBytes) {
    return Response.json({ error: "Invalid receipt upload." }, { status: 400 });
  }

  try {
    const body = Buffer.from(await tail.arrayBuffer());
    const uploadId = randomUUID();
    const ticket = await new SignJWT({ checksum: digest(body), source, size: tail.size })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(issuer)
      .setSubject(uploadId)
      .setExpirationTime("10m")
      .sign(signingKey());

    await uploadReceipt({
      key: `${chunkPrefix}${uploadId}`,
      body,
      contentType: "application/octet-stream",
      fileName: "receipt-fragment",
    });

    return Response.json({ ticket }, { status: 201 });
  } catch {
    return Response.json({ error: "The receipt could not be uploaded. Please try again." }, { status: 503 });
  }
}

export async function joinReceiptChunks(first: File, ticket: string, source: string | undefined) {
  if (!ticket) return { file: first };

  const { payload } = await jwtVerify(ticket, signingKey(), { algorithms: ["HS256"], issuer });
  if (
    !source || payload.source !== source || first.size !== RECEIPT_FIRST_CHUNK_BYTES ||
    typeof payload.sub !== "string" || !/^[a-f0-9-]{36}$/.test(payload.sub) ||
    typeof payload.size !== "number" || payload.size < 1 || payload.size > maxTailBytes
  ) {
    throw new Error("Invalid staged receipt.");
  }

  const key = `${chunkPrefix}${payload.sub}`;
  const tail = await getReceiptBytes(key, payload.size);
  if (digest(tail) !== payload.checksum) throw new Error("Receipt fragment differs from upload.");

  return { file: new File([first, tail], first.name, { type: first.type }), key };
}
