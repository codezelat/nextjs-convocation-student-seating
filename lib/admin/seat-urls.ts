import type { SeatStatusFilter } from "@/lib/data/seat-filters";

export function seatDashboardHref({
  query,
  status,
  page,
  edit,
}: {
  query?: string;
  status?: SeatStatusFilter;
  page?: number;
  edit?: string;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (status && status !== "ALL") {
    params.set("status", status);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (edit) {
    params.set("edit", edit);
  }

  const suffix = params.toString();
  return `/hidden-admin/dashboard${suffix ? `?${suffix}` : ""}`;
}
