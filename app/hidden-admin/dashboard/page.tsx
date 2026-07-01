import Link from "next/link";
import {
  DownloadIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";

import { deleteSeatAction, logoutAction } from "@/app/hidden-admin/actions";
import { BrandMark } from "@/components/brand-mark";
import { ImportPanel } from "@/components/admin/import-panel";
import { SeatForm } from "@/components/admin/seat-form";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  findSeatById,
  getSeatStats,
  listSeats,
} from "@/lib/data/seats";
import type { AdminSeatRow } from "@/lib/data/seats";
import { requireAdmin } from "@/lib/auth/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    edit?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const query = params.q ?? "";
  const page = Number(params.page ?? 1);
  const [stats, listing, editSeat] = await Promise.all([
    getSeatStats(),
    listSeats({ query, page, pageSize: 20 }),
    params.edit ? findSeatById(params.edit) : null,
  ]);

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-2xl bg-background p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between">
          <BrandMark href="/hidden-admin/dashboard" />
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="text-sm text-muted-foreground">{session.email}</div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                <LogOutIcon data-icon="inline-start" />
                Logout
              </Button>
            </form>
          </div>
        </header>

        {params.success || params.error ? (
          <div className="rounded-xl bg-background p-3 text-sm ring-1 ring-border">
            <span className={params.error ? "text-destructive" : "text-foreground"}>
              {params.error ?? params.success}
            </span>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Stat label="Total records" value={stats.total} />
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
                  Compact list view. Open a record for the full seat details.
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
                name="q"
                defaultValue={query}
                placeholder="Search reference, student, name, seat"
              />
              <Button type="submit" variant="outline" className="sm:w-28">
                <SearchIcon data-icon="inline-start" />
                Search
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Graduate</TableHead>
                    <TableHead className="w-[120px]">Session</TableHead>
                    <TableHead className="w-[120px]">Seat</TableHead>
                    <TableHead className="w-[110px]">Ticket</TableHead>
                    <TableHead>Visitors</TableHead>
                    <TableHead className="w-[150px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listing.seats.map((seat) => (
                    <TableRow key={seat.id}>
                      <TableCell>
                        <div className="flex min-w-[260px] flex-col gap-1">
                          <span className="font-medium leading-5">
                            {seat.stageAnnouncingName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {seat.referenceId} · {seat.studentId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{seat.sessionNo}</TableCell>
                      <TableCell className="font-medium">{seat.seatNo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {seat.ticketCategory} · {visitorLabel(seat)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <VisitorSeats seats={seat.balconyVisitorSeatNos} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <SeatDetailsDialog seat={seat} />
                          <Button
                            nativeButton={false}
                            variant="ghost"
                            size="icon-sm"
                            render={
                              <Link
                                href={dashboardHref({ query, edit: seat.id })}
                                aria-label={`Edit ${seat.referenceId}`}
                              />
                            }
                          >
                            <PencilIcon />
                          </Button>
                          <form action={deleteSeatAction}>
                            <input type="hidden" name="id" value={seat.id} />
                            <Button
                              type="submit"
                              variant="destructive"
                              size="icon-sm"
                              aria-label={`Delete ${seat.referenceId}`}
                            >
                              <Trash2Icon />
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <nav
              aria-label="pagination"
              className="mt-4 flex items-center justify-center gap-2"
            >
              <Link
                href={dashboardHref({
                  query,
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
                href={dashboardHref({
                  query,
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

function SeatDetailsDialog({ seat }: { seat: AdminSeatRow }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`View ${seat.referenceId}`}
          />
        }
      >
        <EyeIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{seat.stageAnnouncingName}</DialogTitle>
          <DialogDescription>
            Full seating record for reference {seat.referenceId}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Session No" value={seat.sessionNo} />
          <Detail label="Student ID" value={seat.studentId} />
          <Detail label="Seat No" value={seat.seatNo} />
          <Detail label="Ticket" value={`Category ${seat.ticketCategory}`} />
          <div className="rounded-xl bg-muted/60 p-3 sm:col-span-2">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Balcony Visitors Seat No
            </div>
            <div className="mt-2">
              <VisitorSeats seats={seat.balconyVisitorSeatNos} prominent />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words font-medium">{value}</div>
    </div>
  );
}

function VisitorSeats({
  seats,
  prominent = false,
}: {
  seats: string[];
  prominent?: boolean;
}) {
  if (!seats.length) {
    return <span className="text-sm text-muted-foreground">Graduate only</span>;
  }

  return (
    <div className="flex min-w-[160px] flex-wrap gap-1.5">
      {seats.map((seat) => (
        <Badge
          key={seat}
          variant="outline"
          className={
            prominent
              ? "rounded-xl border-primary/30 bg-background px-3 py-1.5 text-sm font-semibold"
              : "rounded-lg bg-background"
          }
        >
          {formatBalconySeat(seat)}
        </Badge>
      ))}
    </div>
  );
}

function visitorLabel(seat: AdminSeatRow) {
  if (seat.ticketCategory === "A") {
    return "Graduate";
  }

  return `${seat.balconyVisitorSeatNos.length} visitor${
    seat.balconyVisitorSeatNos.length === 1 ? "" : "s"
  }`;
}

function formatBalconySeat(value: string) {
  return value.trim().toLowerCase().startsWith("balcony")
    ? value
    : `Balcony ${value}`;
}

function dashboardHref({
  query,
  page,
  edit,
}: {
  query?: string;
  page?: number;
  edit?: string;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
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
