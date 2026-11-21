import { createHash } from "node:crypto";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3ServiceException,
  paginateListObjectsV2,
} from "@aws-sdk/client-s3";

import { connectReceiptStorage } from "../lib/storage/receipt-storage-config";

const prefix = "certificate-requests/";

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const source = connectReceiptStorage("B2");
  const target = connectReceiptStorage("R2");
  let verified = 0;

  try {
    for await (const page of paginateListObjectsV2(
      { client: source.client },
      { Bucket: source.bucket, Prefix: prefix }
    )) {
      for (const item of page.Contents ?? []) {
        if (!item.Key) throw new Error("Source object lacks a key.");
        const Key = item.Key;
        const origin = await source.client.send(
          new GetObjectCommand({ Bucket: source.bucket, Key })
        );
        if (!origin.Body) throw new Error("Source object lacks a body.");
        const bytes = await origin.Body.transformToByteArray();
        if (bytes.length !== item.Size) throw new Error("Source object size changed during the copy.");

        try {
          await target.client.send(new PutObjectCommand({
            Bucket: target.bucket,
            Key,
            Body: bytes,
            ContentLength: bytes.length,
            ContentType: origin.ContentType,
            ContentDisposition: origin.ContentDisposition,
            ContentEncoding: origin.ContentEncoding,
            ContentLanguage: origin.ContentLanguage,
            CacheControl: "private, no-store, max-age=0",
            Metadata: origin.Metadata,
            IfNoneMatch: "*",
          }));
        } catch (error) {
          if (!(error instanceof S3ServiceException) || error.$metadata.httpStatusCode !== 412) {
            throw error;
          }
        }

        const copy = await target.client.send(
          new GetObjectCommand({ Bucket: target.bucket, Key })
        );
        if (
          !copy.Body ||
          sha256(await copy.Body.transformToByteArray()) !== sha256(bytes) ||
          copy.ContentType !== origin.ContentType ||
          copy.ContentDisposition !== origin.ContentDisposition ||
          copy.ContentEncoding !== origin.ContentEncoding ||
          copy.ContentLanguage !== origin.ContentLanguage ||
          Object.entries(origin.Metadata ?? {}).some(([name, value]) => copy.Metadata?.[name] !== value) ||
          !copy.CacheControl?.includes("no-store")
        ) {
          throw new Error("Destination content or receipt metadata differs from the source.");
        }
        verified += 1;
      }
    }
  } finally {
    source.client.destroy();
    target.client.destroy();
  }

  console.log(`Verified ${verified} receipts in R2 by SHA-256 and response metadata.`);
}

main().catch((error: unknown) => {
  const summary = error instanceof S3ServiceException
    ? `${error.name} (HTTP ${error.$metadata.httpStatusCode ?? "unknown"})`
    : error instanceof Error ? error.message : "Unexpected error";
  console.error(`Receipt copy failed: ${summary}`);
  process.exitCode = 1;
});
