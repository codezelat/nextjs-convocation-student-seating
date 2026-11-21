import { S3Client } from "@aws-sdk/client-s3";

export function connectReceiptStorage(provider = process.env.RECEIPT_STORAGE_PROVIDER ?? "B2") {
  if (provider !== "B2" && provider !== "R2") {
    throw new Error("RECEIPT_STORAGE_PROVIDER must be B2 or R2.");
  }

  const endpoint = requiredEnv(`${provider}_S3_ENDPOINT`);
  const endpointPattern = provider === "R2"
    ? /^https:\/\/[a-f0-9]{32}(?:\.(?:eu|fedramp|us))?\.r2\.cloudflarestorage\.com\/?$/i
    : /^https:\/\/s3\.[a-z0-9-]+\.backblazeb2\.com\/?$/i;
  if (!endpointPattern.test(endpoint)) {
    throw new Error(`${provider}_S3_ENDPOINT must be the provider's HTTPS S3 endpoint.`);
  }

  const bucket = requiredEnv(`${provider}_BUCKET_NAME`);
  const client = new S3Client({
    endpoint,
    region: provider === "R2" ? "auto" : requiredEnv("B2_REGION"),
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: requiredEnv(`${provider}_KEY_ID`),
      secretAccessKey: requiredEnv(provider === "R2" ? "R2_SECRET_ACCESS_KEY" : "B2_APPLICATION_KEY"),
    },
  });

  return { client, bucket, provider };
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
