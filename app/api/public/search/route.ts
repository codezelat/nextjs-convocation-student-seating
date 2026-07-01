import { findSeatByReference } from "@/lib/data/seats";

export async function POST(request: Request) {
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
