import { createHmac } from "node:crypto";

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();
const maximumTrackedKeys = 10_000;

/**
 * Sliding-window rate limiter backed by in-process memory. Sufficient for a
 * single Next.js server deployment; limits reset on restart by design.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucket = buckets.get(key);
  const hits = bucket?.hits.filter((timestamp) => timestamp > windowStart) ?? [];

  if (hits.length === 0) {
    buckets.delete(key);
  }

  if (buckets.size >= maximumTrackedKeys) {
    pruneExpiredKeys(windowStart);
  }

  const success = hits.length < limit;

  if (success) {
    hits.push(now);
  }

  if (hits.length > 0) {
    buckets.set(key, { hits });
  }

  if (success) {
    return {
      success: true,
      remaining: limit - hits.length,
      retryAfterSeconds: 0,
    };
  }

  const oldestHit = hits[0];
  const retryAfterMs = oldestHit + windowMs - now;

  return {
    success: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
}

/**
 * Privacy-preserving client identifier: an HMAC of the caller's IP address so
 * raw IPs are never retained in memory. Returns undefined when the source
 * cannot be determined (e.g. local development) so limiting can be skipped.
 */
export function getClientSourceHash(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");

  const identifier = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    : request.headers.get("cf-connecting-ip")?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      forwardedFor?.split(",")[0]?.trim();

  const secret = process.env.SESSION_SECRET;

  if (!identifier || !secret) {
    return undefined;
  }

  return createHmac("sha256", secret).update(identifier).digest("hex");
}

function pruneExpiredKeys(windowStart: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.hits.every((timestamp) => timestamp <= windowStart)) {
      buckets.delete(key);
    }
  }
}
