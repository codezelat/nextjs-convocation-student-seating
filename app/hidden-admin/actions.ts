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
import {
  SeatConflictError,
  deleteSeat,
  saveSeat,
  setSeatsStatus,
  setSeatsStatusByFilter,
} from "@/lib/data/seats";
import { normalizeSeatStatus } from "@/lib/data/seat-filters";
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

  const id = String(formData.get("id") ?? "").trim() || undefined;

  try {
    await saveSeat(result.rows[0], id);
  } catch (error) {
    if (error instanceof SeatConflictError) {
      redirect(`/hidden-admin/dashboard?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/hidden-admin/dashboard");
  redirect("/hidden-admin/dashboard?success=Student record saved");
}

export async function setSeatsStatusAction(formData: FormData) {
  await requireAdmin();

  const status = formData.get("status") === "OUTDATED" ? "OUTDATED" : "ACTIVE";
  const allMatching = formData.get("scope") === "all-matching";
  const query = String(formData.get("q") ?? "");
  const statusFilter = normalizeSeatStatus(String(formData.get("statusFilter") ?? "ALL"));
  const ids = formData
    .getAll("ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!allMatching && ids.length === 0) {
    redirect(
      `/hidden-admin/dashboard?error=${encodeURIComponent(
        "Select at least one record first."
      )}`
    );
  }

  let result;
  try {
    result = allMatching
      ? await setSeatsStatusByFilter({ query, status: statusFilter }, status)
      : await setSeatsStatus(ids, status);
  } catch (error) {
    if (error instanceof SeatConflictError) {
      redirect(`/hidden-admin/dashboard?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/hidden-admin/dashboard");

  const verb = status === "OUTDATED" ? "marked as outdated" : "restored to active";
  let message = `${result.updated} record${result.updated === 1 ? "" : "s"} ${verb}.`;

  if (result.conflicts.length > 0) {
    const shown = result.conflicts.slice(0, 10).join(", ");
    message += ` Skipped (reference already active elsewhere): ${shown}${
      result.conflicts.length > 10 ? "…" : ""
    }.`;
  }

  const params = new URLSearchParams({ success: message });
  if (query.trim()) params.set("q", query.trim());
  if (statusFilter !== "ALL") params.set("status", statusFilter);
  redirect(`/hidden-admin/dashboard?${params.toString()}`);
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
