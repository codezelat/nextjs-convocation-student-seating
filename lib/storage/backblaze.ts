import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  S3Client,
  type ServerSideEncryption,
} from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type UploadReceiptInput = {
  key: string;
  body: Buffer;
  contentType: string;
  fileName: string;
};

let client: S3Client | undefined;

export async function uploadReceipt(input: UploadReceiptInput) {
  await getB2Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: input.key,
      Body: input.body,
      ContentLength: input.body.length,
      ContentType: input.contentType,
      ContentDisposition: contentDisposition(input.fileName),
      CacheControl: "private, no-store, max-age=0",
      ServerSideEncryption: "AES256" as ServerSideEncryption,
    })
  );
}

export async function deleteReceipt(key: string) {
  await getB2Client().send(
    new DeleteObjectCommand({ Bucket: getBucketName(), Key: key })
  );
}

export async function getReceiptDownloadUrl({
  key,
  fileName,
}: {
  key: string;
  fileName: string;
}) {
  return getSignedUrl(
    getB2Client(),
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ResponseContentDisposition: contentDisposition(fileName),
      ResponseCacheControl: "private, no-store, max-age=0",
    }),
    { expiresIn: 60 }
  );
}

export async function verifyReceiptStorage() {
  await getB2Client().send(new HeadBucketCommand({ Bucket: getBucketName() }));
}

function getB2Client() {
  if (client) {
    return client;
  }

  const endpoint = requiredEnv("B2_S3_ENDPOINT");
  const region = requiredEnv("B2_REGION");

  if (!endpoint.startsWith("https://s3.") || !endpoint.endsWith(".backblazeb2.com")) {
    throw new Error("B2_S3_ENDPOINT must be a Backblaze HTTPS S3 endpoint.");
  }

  client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv("B2_KEY_ID"),
      secretAccessKey: requiredEnv("B2_APPLICATION_KEY"),
    },
  });

  return client;
}

function getBucketName() {
  return requiredEnv("B2_BUCKET_NAME");
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
