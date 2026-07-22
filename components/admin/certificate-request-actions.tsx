"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { CertificateStatusBadge } from "@/components/admin/certificate-status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CERTIFICATE_REQUEST_STATUSES,
  CERTIFICATE_STATUS_LABELS,
  SRI_LANKA_DISTRICTS,
} from "@/lib/certificates/constants";
import type { AdminCertificateRequest } from "@/lib/data/certificate-requests";

type ApiResponse = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function CertificateRequestActions({
  request,
}: {
  request: AdminCertificateRequest;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function removeRequest() {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/certificate-requests/${encodeURIComponent(request.id)}`,
        { method: "DELETE" }
      );
      const data = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        toast.error(data.error ?? "The request could not be deleted.");
        return;
      }

      toast.success("Certificate request deleted");
      setDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error("Unable to connect. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex justify-end gap-1">
      <Dialog>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`View ${request.studentId}`}
            />
          }
        >
          <EyeIcon />
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{request.fullName}</DialogTitle>
            <DialogDescription>
              Certificate pack request for {request.studentId}.
            </DialogDescription>
          </DialogHeader>
          <RequestDetails request={request} />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${request.studentId}`}
            />
          }
        >
          <PencilIcon />
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {request.studentId}</DialogTitle>
            <DialogDescription>
              Update graduate, delivery and processing details.
            </DialogDescription>
          </DialogHeader>
          <CertificateEditForm
            request={request}
            onSaved={() => {
              setEditOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant="destructive"
              size="icon-sm"
              aria-label={`Delete ${request.studentId}`}
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the request and its private payment receipt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={removeRequest}
            >
              {deleting ? "Deleting..." : "Delete request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RequestDetails({ request }: { request: AdminCertificateRequest }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <CertificateStatusBadge status={request.status} />
        <span className="text-sm text-muted-foreground">
          Submitted {formatDate(request.createdAt)}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Detail label="Student ID Number" value={request.studentId} />
        <Detail label="District" value={request.district} />
        <Detail label="WhatsApp Number" value={request.whatsappNumber} />
        <Detail
          label="Delivery Contact Number"
          value={request.deliveryContactNumber}
        />
        <Detail
          label="Full Delivery Address"
          value={request.deliveryAddress}
          className="sm:col-span-2"
        />
        <Detail
          label="Courier Reference"
          value={request.courierReference || "Not added"}
        />
        <Detail
          label="Internal Note"
          value={request.internalNote || "No internal note"}
        />
      </div>
      <Button
        nativeButton={false}
        variant="outline"
        className="self-start"
        render={
          <a
            href={`/api/admin/certificate-requests/${encodeURIComponent(request.id)}/receipt`}
            target="_blank"
            rel="noreferrer"
          />
        }
      >
        <DownloadIcon data-icon="inline-start" />
        View payment receipt
      </Button>
    </div>
  );
}

function CertificateEditForm({
  request,
  onSaved,
}: {
  request: AdminCertificateRequest;
  onSaved: () => void;
}) {
  const [district, setDistrict] = useState(request.district);
  const [status, setStatus] = useState(request.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData);

    try {
      const response = await fetch(
        `/api/admin/certificate-requests/${encodeURIComponent(request.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, district, status }),
        }
      );
      const data = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        setError(data.error ?? "The request could not be updated.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      toast.success("Certificate request updated");
      onSaved();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <EditField name="studentId" label="Student ID Number" error={firstError(fieldErrors.studentId)}>
          <Input id="edit-studentId" name="studentId" defaultValue={request.studentId} required aria-invalid={Boolean(fieldErrors.studentId)} />
        </EditField>
        <EditField name="fullName" label="Full Name" error={firstError(fieldErrors.fullName)} className="sm:col-span-2">
          <Input id="edit-fullName" name="fullName" defaultValue={request.fullName} required aria-invalid={Boolean(fieldErrors.fullName)} />
        </EditField>
        <EditField name="whatsappNumber" label="WhatsApp Number" error={firstError(fieldErrors.whatsappNumber)}>
          <Input id="edit-whatsappNumber" name="whatsappNumber" type="tel" defaultValue={request.whatsappNumber} required aria-invalid={Boolean(fieldErrors.whatsappNumber)} />
        </EditField>
        <EditField name="deliveryContactNumber" label="Delivery Contact Number" error={firstError(fieldErrors.deliveryContactNumber)}>
          <Input id="edit-deliveryContactNumber" name="deliveryContactNumber" type="tel" defaultValue={request.deliveryContactNumber} required aria-invalid={Boolean(fieldErrors.deliveryContactNumber)} />
        </EditField>
        <EditField name="deliveryAddress" label="Full Delivery Address" error={firstError(fieldErrors.deliveryAddress)} className="sm:col-span-2">
          <Textarea id="edit-deliveryAddress" name="deliveryAddress" defaultValue={request.deliveryAddress} rows={4} required aria-invalid={Boolean(fieldErrors.deliveryAddress)} />
        </EditField>
        <EditField name="district" label="District" error={firstError(fieldErrors.district)}>
          <Select value={district} onValueChange={(value) => setDistrict(value ?? district)}>
            <SelectTrigger id="edit-district" className="w-full" aria-invalid={Boolean(fieldErrors.district)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SRI_LANKA_DISTRICTS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </EditField>
        <EditField name="status" label="Status" error={firstError(fieldErrors.status)}>
          <Select value={status} onValueChange={(value) => setStatus(value ?? status)}>
            <SelectTrigger id="edit-status" className="w-full" aria-invalid={Boolean(fieldErrors.status)}>
              <SelectValue>
                {CERTIFICATE_STATUS_LABELS[
                  status as keyof typeof CERTIFICATE_STATUS_LABELS
                ] ?? status}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CERTIFICATE_REQUEST_STATUSES.map((item) => <SelectItem key={item} value={item}>{CERTIFICATE_STATUS_LABELS[item]}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </EditField>
        <EditField name="courierReference" label="Courier Reference">
          <Input id="edit-courierReference" name="courierReference" defaultValue={request.courierReference ?? ""} />
        </EditField>
        <EditField name="internalNote" label="Internal Note" className="sm:col-span-2">
          <Textarea id="edit-internalNote" name="internalNote" defaultValue={request.internalNote ?? ""} rows={3} />
        </EditField>
      </FieldGroup>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending} className="self-start">
        <SaveIcon data-icon="inline-start" />
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

function EditField({
  name,
  label,
  error,
  className,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={Boolean(error)} className={className}>
      <FieldLabel htmlFor={`edit-${name}`}>{label}</FieldLabel>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-muted/60 p-3", className)}>
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap break-words font-medium">{value}</div>
    </div>
  );
}

function firstError(errors: string[] | undefined) {
  return errors?.[0];
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}
