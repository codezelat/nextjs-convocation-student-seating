import { cookies } from "next/headers";

import { verifyAdminToken } from "@/lib/auth/session";
import { findCertificateReceiptById } from "@/lib/data/certificate-requests";
import { getReceiptDownloadUrl } from "@/lib/storage/backblaze";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const session = await verifyAdminToken(
    cookieStore.get("sitc_admin_session")?.value
  );

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const receipt = await findCertificateReceiptById(id);
  if (!receipt) {
    return Response.json({ error: "Request not found." }, { status: 404 });
  }

  try {
    const url = await getReceiptDownloadUrl({
      key: receipt.receiptObjectKey,
      fileName: receipt.receiptFileName,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Certificate receipt URL generation failed", error);
    return Response.json(
      { error: "The receipt is temporarily unavailable." },
      { status: 503 }
    );
  }
}
