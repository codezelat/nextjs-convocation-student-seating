import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { connectReceiptStorage } from "./receipt-storage-config";

type UploadReceiptInput = {
  key: string;
  body: Buffer;
  contentType: string;
  fileName: string;
};

let storage: ReturnType<typeof connectReceiptStorage> | undefined;

function getStorage() {
  storage ??= connectReceiptStorage();
  return storage;
}

export async function uploadReceipt(input: UploadReceiptInput) {
  const { client, bucket, provider } = getStorage();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentLength: input.body.length,
      ContentType: input.contentType,
      ContentDisposition: contentDisposition(input.fileName),
      CacheControl: "private, no-store, max-age=0",
      ...(provider === "B2" && { ServerSideEncryption: "AES256" }),
    })
  );
}

export async function deleteReceipt(key: string) {
  const { client, bucket } = getStorage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getReceiptBytes(key: string, expectedBytes: number) {
  const { client, bucket } = getStorage();
  const receipt = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!receipt.Body || receipt.ContentLength !== expectedBytes) {
    throw new Error("Receipt size differs from the staged size.");
  }
  return new Uint8Array(await receipt.Body.transformToByteArray());
}

export async function getReceiptDownloadUrl({
  key,
  fileName,
}: {
  key: string;
  fileName: string;
}) {
  const { client, bucket, provider } = getStorage();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(provider === "B2" && {
        ResponseContentDisposition: contentDisposition(fileName),
        ResponseCacheControl: "private, no-store, max-age=0",
      }),
    }),
    { expiresIn: 60 }
  );
}

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
