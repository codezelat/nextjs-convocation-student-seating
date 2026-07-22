import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { verifyAdminToken } from "@/lib/auth/session";
import { certificateAdminUpdateSchema } from "@/lib/certificates/validation";
import {
  deleteCertificateRequestRecord,
  findCertificateReceiptById,
  updateCertificateRequest,
} from "@/lib/data/certificate-requests";
import { deleteReceipt } from "@/lib/storage/backblaze";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = certificateAdminUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Please correct the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { id } = await context.params;

  try {
    await updateCertificateRequest(id, parsed.data);
    revalidatePath("/hidden-admin/certificate");
    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error: "A request already exists for this Student ID Number.",
          fieldErrors: {
            studentId: ["A request already exists for this Student ID Number."],
          },
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return Response.json({ error: "Request not found." }, { status: 404 });
    }

    console.error("Certificate request update failed", error);
    return Response.json(
      { error: "The request could not be updated." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const receipt = await findCertificateReceiptById(id);
  if (!receipt) {
    return Response.json({ error: "Request not found." }, { status: 404 });
  }

  try {
    await deleteReceipt(receipt.receiptObjectKey);
  } catch (error) {
    console.error("Certificate receipt deletion failed", error);
    return Response.json(
      { error: "The private receipt could not be deleted. No record was removed." },
      { status: 502 }
    );
  }

  try {
    await deleteCertificateRequestRecord(id);
    revalidatePath("/hidden-admin/certificate");
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Certificate request deletion failed after receipt removal", error);
    return Response.json(
      {
        error:
          "The receipt was removed, but the record could not be deleted. Please retry.",
      },
      { status: 500 }
    );
  }
}

async function isAdmin() {
  const cookieStore = await cookies();
  return Boolean(
    await verifyAdminToken(cookieStore.get("sitc_admin_session")?.value)
  );
}
