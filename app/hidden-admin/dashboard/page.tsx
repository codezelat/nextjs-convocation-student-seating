import Link from "next/link";
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { AdminHeader } from "@/components/admin/admin-header";
import { ImportPanel } from "@/components/admin/import-panel";
import { SeatForm } from "@/components/admin/seat-form";
import {
  SeatsTable,
} from "@/components/admin/seats-table";
import { seatDashboardHref } from "@/lib/admin/seat-urls";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { findSeatById, getSeatStats, listSeats } from "@/lib/data/seats";
import { normalizeSeatStatus } from "@/lib/data/seat-filters";
import { requireAdmin } from "@/lib/auth/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    edit?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const query = params.q ?? "";
  const statusFilter = normalizeSeatStatus(params.status);
  const page = Number(params.page ?? 1);
  const [stats, listing, editSeat] = await Promise.all([
    getSeatStats(),
    listSeats({ query, status: statusFilter, page, pageSize: 20 }),
    params.edit ? findSeatById(params.edit) : null,
  ]);

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <AdminHeader email={session.email} active="seating" />

        {params.success || params.error ? (
          <div className="rounded-xl bg-background p-3 text-sm ring-1 ring-border">
            <span className={params.error ? "text-destructive" : "text-foreground"}>
              {params.error ?? params.success}
            </span>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Total records" value={stats.total} />
          <Stat label="Active" value={stats.active} />
          <Stat label="Outdated" value={stats.outdated} />
          <Stat label="Ticket A" value={stats.tickets.A ?? 0} />
          <Stat label="Ticket B" value={stats.tickets.B ?? 0} />
          <Stat label="Ticket C" value={stats.tickets.C ?? 0} />
        </section>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Student seating records</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Outdated records no longer respond to public seat lookups.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Dialog>
                  <DialogTrigger
                    render={
                      <Button variant="outline" className="justify-center" />
                    }
                  >
                    <FileSpreadsheetIcon data-icon="inline-start" />
                    Import Excel
                  </DialogTrigger>
                  <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Excel import</DialogTitle>
                      <DialogDescription>
                        Validate the workbook first, then import once it is clean.
                      </DialogDescription>
                    </DialogHeader>
                    <ImportPanel chrome="plain" />
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger
                    render={
                      <Button className="justify-center" />
                    }
                  >
                    <PlusIcon data-icon="inline-start" />
                    Add record
                  </DialogTrigger>
                  <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Manual record</DialogTitle>
                      <DialogDescription>
                        Add a graduate seating record by reference ID.
                      </DialogDescription>
                    </DialogHeader>
                    <SeatForm chrome="plain" />
                  </DialogContent>
                </Dialog>
                <Button
                  nativeButton={false}
                  variant="ghost"
                  render={<a href="/api/sample-format" />}
                >
                  <DownloadIcon data-icon="inline-start" />
                  Sample format
                </Button>
              </div>
            </div>
            <form className="flex max-w-xl flex-col gap-2 sm:flex-row">
              <Input
                key={query}
                name="q"
                defaultValue={query}
                placeholder="Search reference, student, name, seat, program"
              />
              <select
                name="status"
                defaultValue={statusFilter}
                aria-label="Filter by status"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-40"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="OUTDATED">Outdated</option>
              </select>
              <Button type="submit" variant="outline" className="sm:w-28">
                <SearchIcon data-icon="inline-start" />
                Search
              </Button>
            </form>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SeatsTable
              key={`${query}|${statusFilter}|${listing.page}`}
              seats={listing.seats}
              query={query}
              status={statusFilter}
              totalMatching={listing.total}
            />

            <nav
              aria-label="pagination"
              className="mt-2 flex items-center justify-center gap-2"
            >
              <Link
                href={seatDashboardHref({
                  query,
                  status: statusFilter,
                  page: Math.max(1, listing.page - 1),
                })}
                className={buttonVariants({ variant: "outline" })}
                aria-label="Go to previous page"
              >
                Previous
              </Link>
              <span className="px-3 text-sm text-muted-foreground">
                Page {listing.page} of {listing.totalPages}
              </span>
              <Link
                href={seatDashboardHref({
                  query,
                  status: statusFilter,
                  page: Math.min(listing.totalPages, listing.page + 1),
                })}
                className={buttonVariants({ variant: "outline" })}
                aria-label="Go to next page"
              >
                Next
              </Link>
            </nav>
          </CardContent>
        </Card>

        {editSeat ? (
          <Dialog defaultOpen>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit {editSeat.referenceId}</DialogTitle>
                <DialogDescription>
                  Update the selected graduate seating record.
                </DialogDescription>
              </DialogHeader>
              <SeatForm seat={editSeat} chrome="plain" />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
