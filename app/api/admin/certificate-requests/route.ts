import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { verifyAdminToken } from "@/lib/auth/session";
import {
  CertificateSubmissionError,
  submitCertificateRequest,
} from "@/lib/certificates/service";
import {
  parseLimitedFormData,
  RequestBodyTooLargeError,
} from "@/lib/http/form-data";

const maximumRequestBytes = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await verifyAdminToken(
    cookieStore.get("sitc_admin_session")?.value
  );

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await parseLimitedFormData(request, maximumRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json(
        { error: "Payment receipt must be 5 MB or smaller." },
        { status: 413 }
      );
    }
    return Response.json({ error: "Invalid form submission." }, { status: 400 });
  }

  try {
    await submitCertificateRequest(formData);
    revalidatePath("/hidden-admin/certificate");
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof CertificateSubmissionError) {
      return Response.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: error.status }
      );
    }

    console.error("Unexpected admin certificate request error", error);
    return Response.json(
      { error: "The request could not be created. Please try again." },
      { status: 500 }
    );
  }
}
