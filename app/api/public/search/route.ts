import { findSeatByReference } from "@/lib/data/seats";
import { getClientSourceHash, rateLimit } from "@/lib/http/rate-limit";

const searchRateLimit = { limit: 30, windowMs: 60 * 1000 };

export async function POST(request: Request) {
  const sourceHash = getClientSourceHash(request);

  if (sourceHash) {
    const limit = rateLimit(sourceHash, searchRateLimit);

    if (!limit.success) {
      return Response.json(
        {
          found: false,
          error: "Too many searches. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }
  }

  const body = (await request.json().catch(() => null)) as {
    referenceId?: string;
  } | null;
  const referenceId = body?.referenceId?.trim();

  if (!referenceId) {
    return Response.json(
      { found: false, error: "Reference ID is required." },
      { status: 400 }
    );
  }

  const seat = await findSeatByReference(referenceId);

  if (!seat) {
    return Response.json({ found: false }, { status: 404 });
  }

  return Response.json({ found: true, referenceId: seat.referenceId });
}
