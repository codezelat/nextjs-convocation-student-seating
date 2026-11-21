import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { parseSeatWorkbook } from "@/lib/import/excel";
import { SeatConflictError, replaceSeats, upsertSeats } from "@/lib/data/seats";
import { verifyAdminToken } from "@/lib/auth/session";

export const maxDuration = 60;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await verifyAdminToken(
    cookieStore.get("sitc_admin_session")?.value
  );

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const commit = formData.get("commit") === "true";
  const mode = formData.get("mode") === "replace" ? "replace" : "upsert";

  if (!(file instanceof File)) {
    return Response.json({ error: "Upload an Excel workbook." }, { status: 400 });
  }

  if (!file.name.endsWith(".xlsx")) {
    return Response.json({ error: "Only .xlsx files are supported." }, { status: 400 });
  }

  const result = await parseSeatWorkbook(await file.arrayBuffer());

  if (result.errors.length > 0) {
    return Response.json({
      ok: false,
      committed: false,
      validRows: result.rows.length,
      errors: result.errors.slice(0, 100),
      errorCount: result.errors.length,
    });
  }

  if (commit) {
    try {
      if (mode === "replace") {
        await replaceSeats(result.rows);
      } else {
        await upsertSeats(result.rows);
      }
    } catch (error) {
      if (error instanceof SeatConflictError) {
        return Response.json({ ok: false, error: error.message }, { status: 409 });
      }
      throw error;
    }

    revalidatePath("/hidden-admin/dashboard");
  }

  return Response.json({
    ok: true,
    committed: commit,
    validRows: result.rows.length,
    errors: [],
    errorCount: 0,
  });
}
