"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { deleteSeatAction, setSeatsStatusAction } from "@/app/hidden-admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminSeatRow, SeatStatusFilter } from "@/lib/data/seats";
import { seatDashboardHref } from "@/lib/admin/seat-urls";

type SeatsTableProps = {
  seats: AdminSeatRow[];
  query: string;
  status: SeatStatusFilter;
  totalMatching: number;
};

export function SeatsTable({
  seats,
  query,
  status,
  totalMatching,
}: SeatsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allMatching, setAllMatching] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"OUTDATED" | "ACTIVE" | null>(
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const statusInputRef = useRef<HTMLInputElement>(null);

  const selected = new Set(selectedIds);
  const pageIds = seats.map((seat) => seat.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));
  const hasOtherPages = totalMatching > pageIds.length;
  const selectionCount = allMatching ? totalMatching : selectedIds.length;

  function toggleRow(id: string) {
    setAllMatching(false);
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id]
    );
  }

  function togglePage() {
    if (allMatching || allOnPageSelected) {
      setAllMatching(false);
      setSelectedIds([]);
    } else {
      setSelectedIds(pageIds);
    }
  }

  function clearSelection() {
    setAllMatching(false);
    setSelectedIds([]);
  }

  function confirmStatusChange(next: "OUTDATED" | "ACTIVE") {
    if (statusInputRef.current) {
      statusInputRef.current.value = next;
    }
    setConfirmStatus(null);
    formRef.current?.requestSubmit();
  }

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={setSeatsStatusAction} className="hidden">
        <input type="hidden" name="q" value={query} />
        <input type="hidden" name="statusFilter" value={status} />
        <input type="hidden" name="scope" value={allMatching ? "all-matching" : "selection"} />
        <input ref={statusInputRef} type="hidden" name="status" value="OUTDATED" />
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
      </form>

      {selectionCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">
              {selectionCount} record{selectionCount === 1 ? "" : "s"} selected
              {allMatching ? " (all matching)" : ""}
            </span>
            {allMatching ? (
              <Button variant="ghost" size="sm" onClick={() => setAllMatching(false)}>
                Select only this page
              </Button>
            ) : hasOtherPages ? (
              <Button variant="ghost" size="sm" onClick={() => setAllMatching(true)}>
                Select all {totalMatching} matching records
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear selection"
              onClick={clearSelection}
            >
              <XIcon />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirmStatus("ACTIVE")}>
              <ArchiveRestoreIcon data-icon="inline-start" />
              Restore to active
            </Button>
            <Button variant="destructive" onClick={() => setConfirmStatus("OUTDATED")}>
              <ArchiveIcon data-icon="inline-start" />
              Mark as outdated
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allMatching || allOnPageSelected}
                  indeterminate={!allMatching && !allOnPageSelected && someOnPageSelected}
                  onCheckedChange={togglePage}
                  aria-label="Select all records on this page"
                />
              </TableHead>
              <TableHead>Graduate</TableHead>
              <TableHead className="w-[120px]">Session</TableHead>
              <TableHead className="w-[120px]">Seat</TableHead>
              <TableHead className="w-[110px]">Ticket</TableHead>
              <TableHead>Visitors</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seats.map((seat) => (
              <TableRow key={seat.id} className={seat.status === "OUTDATED" ? "opacity-60" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(seat.id) || allMatching}
                    onCheckedChange={() => toggleRow(seat.id)}
                    aria-label={`Select ${seat.referenceId}`}
                  />
                </TableCell>
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
                  <StatusBadge status={seat.status} />
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
                          href={seatDashboardHref({ query, status, edit: seat.id })}
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

      <AlertDialog
        open={confirmStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmStatus(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmStatus === "OUTDATED"
                ? "Mark records as outdated?"
                : "Restore records to active?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStatus === "OUTDATED"
                ? `${selectionCount} record${selectionCount === 1 ? "" : "s"} will stop responding to public seat lookups until restored. Nothing is deleted.`
                : `${selectionCount} record${selectionCount === 1 ? "" : "s"} will respond to public lookups again. Records whose reference ID is already active elsewhere are skipped.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmStatus) {
                  confirmStatusChange(confirmStatus);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminSeatRow["status"] }) {
  if (status === "OUTDATED") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Outdated
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    >
      Active
    </Badge>
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
          <Detail label="Status" value={seat.status === "OUTDATED" ? "Outdated" : "Active"} />
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
