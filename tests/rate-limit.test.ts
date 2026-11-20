import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getClientSourceHash, rateLimit } from "@/lib/http/rate-limit";

const secretBackup = process.env.SESSION_SECRET;

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-value-at-least-32-chars!!";
  vi.useFakeTimers();
});

afterEach(() => {
  process.env.SESSION_SECRET = secretBackup;
  vi.useRealTimers();
});

describe("sliding window rate limit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const options = { limit: 3, windowMs: 60_000 };
    const key = "allow";

    expect(rateLimit(key, options)).toEqual({
      success: true,
      remaining: 2,
      retryAfterSeconds: 0,
    });
    expect(rateLimit(key, options)).toEqual({
      success: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });
    expect(rateLimit(key, options)).toEqual({
      success: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });

    const blocked = rateLimit(key, options);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("recovers once the oldest hit slides out of the window", () => {
    const options = { limit: 2, windowMs: 60_000 };
    const key = "slide";

    rateLimit(key, options);
    rateLimit(key, options);
    expect(rateLimit(key, options).success).toBe(false);

    vi.setSystemTime(Date.now() + 30_000);
    rateLimit(key, options);

    vi.setSystemTime(Date.now() + 31_000);
    expect(rateLimit(key, options).success).toBe(true);
  });

  it("reports a retry time matching the window boundary", () => {
    const options = { limit: 1, windowMs: 60_000 };
    const key = "retry";

    rateLimit(key, options);
    vi.setSystemTime(Date.now() + 20_000);

    const blocked = rateLimit(key, options);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(40);
  });

  it("tracks keys independently", () => {
    const options = { limit: 1, windowMs: 60_000 };

    expect(rateLimit("independent-a", options).success).toBe(true);
    expect(rateLimit("independent-b", options).success).toBe(true);
    expect(rateLimit("independent-a", options).success).toBe(false);
  });

  it("drops buckets once every hit has expired", () => {
    const options = { limit: 1, windowMs: 1_000 };
    const key = "expire";

    rateLimit(key, options);
    vi.setSystemTime(Date.now() + 2_000);

    expect(rateLimit(key, options)).toEqual({
      success: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
  });
});

describe("client source hash", () => {
  it("prefers cf-connecting-ip and produces a stable HMAC", () => {
    const hash = getClientSourceHash(
      new Request("http://localhost", {
        headers: { "cf-connecting-ip": "203.0.113.10" },
      })
    );

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      getClientSourceHash(
        new Request("http://localhost", {
          headers: { "cf-connecting-ip": "203.0.113.10" },
        })
      )
    ).toBe(hash);
  });

  it("falls back to x-real-ip then the first x-forwarded-for hop", () => {
    const real = getClientSourceHash(
      new Request("http://localhost", {
        headers: { "x-real-ip": "198.51.100.7" },
      })
    );

    const forwarded = getClientSourceHash(
      new Request("http://localhost", {
        headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
      })
    );

    expect(real).toMatch(/^[a-f0-9]{64}$/);
    expect(forwarded).toBe(real);
  });

  it("returns undefined without identifiable headers or a secret", () => {
    expect(getClientSourceHash(new Request("http://localhost"))).toBeUndefined();

    const secret = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    expect(
      getClientSourceHash(
        new Request("http://localhost", {
          headers: { "cf-connecting-ip": "203.0.113.10" },
        })
      )
    ).toBeUndefined();
    process.env.SESSION_SECRET = secret;
  });
});
