import Link from "next/link";

import { AdminHeader } from "@/components/admin/admin-header";
import { CertificateCreateDialog } from "@/components/admin/certificate-create-dialog";
import { CertificateFilters } from "@/components/admin/certificate-filters";
import { CertificateRequestActions } from "@/components/admin/certificate-request-actions";
import { CertificateStatusBadge } from "@/components/admin/certificate-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { CERTIFICATE_REQUEST_STATUSES } from "@/lib/certificates/constants";
import {
  getCertificateRequestStats,
  listCertificateRequests,
} from "@/lib/data/certificate-requests";

export default async function CertificateAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const query = params.q ?? "";
  const requestedStatus = params.status ?? "ALL";
  const status =
    requestedStatus === "ALL" ||
    CERTIFICATE_REQUEST_STATUSES.includes(
      requestedStatus as (typeof CERTIFICATE_REQUEST_STATUSES)[number]
    )
      ? requestedStatus
      : "ALL";
  const page = Number(params.page ?? 1);

  const [stats, listing] = await Promise.all([
    getCertificateRequestStats(),
    listCertificateRequests({ query, status, page, pageSize: 20 }),
  ]);

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <AdminHeader email={session.email} active="certificate" />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total requests" value={stats.total} />
          <Stat label="Pending review" value={stats.statuses.PENDING ?? 0} />
          <Stat label="Verified" value={stats.statuses.VERIFIED ?? 0} />
          <Stat label="Preparing" value={stats.statuses.PREPARING ?? 0} />
          <Stat label="Dispatched" value={stats.statuses.DISPATCHED ?? 0} />
        </section>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Certificate pack requests</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review graduate details, receipts and delivery progress.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link href="/certificate-request" target="_blank" />}
                >
                  Public form
                </Button>
                <CertificateCreateDialog />
              </div>
            </div>
            <CertificateFilters query={query} status={status} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Graduate</TableHead>
                    <TableHead className="w-[190px]">Contact</TableHead>
                    <TableHead className="w-[130px]">District</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[165px]">Submitted</TableHead>
                    <TableHead className="w-[130px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listing.requests.length ? (
                    listing.requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex min-w-[240px] flex-col gap-1">
                            <span className="font-medium leading-5">
                              {request.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {request.studentId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-[160px] flex-col gap-1 text-sm">
                            <span>{request.whatsappNumber}</span>
                            <span className="text-xs text-muted-foreground">
                              Delivery: {request.deliveryContactNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{request.district}</TableCell>
                        <TableCell>
                          <CertificateStatusBadge status={request.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell>
                          <CertificateRequestActions request={request} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                        No certificate requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <nav aria-label="Certificate request pagination" className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link
                href={certificateHref({
                  query,
                  status,
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
                href={certificateHref({
                  query,
                  status,
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(value);
}

function certificateHref({
  query,
  status,
  page,
}: {
  query?: string;
  status?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status && status !== "ALL") params.set("status", status);
  if (page && page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/hidden-admin/certificate${suffix ? `?${suffix}` : ""}`;
}
