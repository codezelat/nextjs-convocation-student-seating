import { findVerifiedCertificateName } from "@/lib/data/certificate-requests";
import { findSeatForResult } from "@/lib/data/seats";
import { ticketDownloadDisposition } from "@/lib/tickets/filename";

export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  const { referenceId } = await params;
  const seat = await findSeatForResult(referenceId);
  if (!seat) {
    return new Response("E-ticket not found.", { status: 404, headers: privateHeaders });
  }

  const [verifiedName, { renderETicket }] = await Promise.all([
    findVerifiedCertificateName(seat.studentId),
    import("@/lib/tickets/pdf"),
  ]);
  const name = verifiedName?.trim() || undefined;
  const pdf = await renderETicket(seat, name);
  return new Response(new Uint8Array(pdf), {
    headers: {
      ...privateHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": ticketDownloadDisposition(name || seat.stageAnnouncingName, seat.referenceId),
      "Content-Length": String(pdf.length),
    },
  });
}
