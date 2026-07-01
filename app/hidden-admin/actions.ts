"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  authenticateAdmin,
  clearAdminSession,
  createAdminSession,
  requireAdmin,
} from "@/lib/auth/session";
import { deleteSeat, upsertSeat } from "@/lib/data/seats";
import { parseSeatRows } from "@/lib/import/seat-workbook";

export type LoginState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Enter the admin email and password." };
  }

  const admin = await authenticateAdmin(parsed.data.email, parsed.data.password);

  if (!admin) {
    return { error: "Invalid admin credentials." };
  }

  await createAdminSession({ sub: admin.id, email: admin.email });
  redirect("/hidden-admin/dashboard");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/hidden-admin");
}

export async function saveSeatAction(formData: FormData) {
  await requireAdmin();

  const result = parseSeatRows([
    [
      "Session No",
      "Reference ID",
      "Student ID",
      "Seat No",
      "Stage Announcing Name",
      "Ticket",
      "Balcony Visitors Seat No",
      "Balcony Visitors Seat No 2",
    ],
    [
      formData.get("sessionNo"),
      formData.get("referenceId"),
      formData.get("studentId"),
      formData.get("seatNo"),
      formData.get("stageAnnouncingName"),
      formData.get("ticketCategory"),
      formData.get("balconyVisitorSeatNo1"),
      formData.get("balconyVisitorSeatNo2"),
    ],
  ]);

  if (result.errors.length > 0 || !result.rows[0]) {
    redirect(
      `/hidden-admin/dashboard?error=${encodeURIComponent(
        result.errors[0]?.message ?? "Invalid student record."
      )}`
    );
  }

  await upsertSeat(result.rows[0]);
  revalidatePath("/hidden-admin/dashboard");
  redirect("/hidden-admin/dashboard?success=Student record saved");
}

export async function deleteSeatAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (id) {
    await deleteSeat(id);
  }

  revalidatePath("/hidden-admin/dashboard");
  redirect("/hidden-admin/dashboard?success=Student record deleted");
}
