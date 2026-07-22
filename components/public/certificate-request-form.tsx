"use client";

import { FormEvent, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2Icon, FileTextIcon, SendIcon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
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
import {
  MAX_RECEIPT_SIZE_LABEL,
  SRI_LANKA_DISTRICTS,
} from "@/lib/certificates/constants";

type SubmissionResponse = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function CertificateRequestForm({
  endpoint = "/api/public/certificate-requests",
  onSuccess,
  showConfirmation = true,
}: {
  endpoint?: string;
  onSuccess?: () => void;
  showConfirmation?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const receiptInputId = useId();
  const [district, setDistrict] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const body = new FormData(event.currentTarget);
    body.set("district", district);
    body.set("confirmation", String(confirmed));

    setPending(true);

    try {
      const response = await fetch(endpoint, { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as SubmissionResponse;

      if (!response.ok) {
        setError(data.error ?? "Your request could not be submitted.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      formRef.current?.reset();
      setDistrict("");
      setConfirmed(false);
      setReceiptName("");

      if (showConfirmation) {
        setSubmitted(true);
      }

      onSuccess?.();
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {submitted ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="flex min-h-80 flex-col items-center justify-center gap-5 px-2 py-10 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-foreground ring-1 ring-border">
            <CheckCircle2Icon className="size-7" aria-hidden="true" />
          </div>
          <div className="flex max-w-lg flex-col gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-normal">
              Request submitted successfully
            </h2>
            <p className="text-pretty leading-7 text-muted-foreground">
              Your Graduate Certificate Pack request has been submitted
              successfully.
            </p>
            <p className="text-pretty text-sm leading-6 text-muted-foreground">
              Please note that your payment and student details will be verified
              before the pack is prepared for delivery. Courier information will
              be shared through WhatsApp once dispatched.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSubmitted(false)}
          >
            Submit another request
          </Button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          ref={formRef}
          onSubmit={submit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col gap-6"
          noValidate
        >
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <FieldGroup className="flex flex-col gap-5">
            <CertificateField
              name="studentId"
              label="Student ID Number"
              error={firstError(fieldErrors.studentId)}
            >
              <Input
                id="studentId"
                name="studentId"
                autoComplete="off"
                maxLength={64}
                aria-invalid={Boolean(fieldErrors.studentId)}
                required
              />
            </CertificateField>

            <CertificateField
              name="fullName"
              label="Full Name"
              description="This will appear on your certificate. Enter it correctly."
              error={firstError(fieldErrors.fullName)}
            >
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                maxLength={191}
                aria-invalid={Boolean(fieldErrors.fullName)}
                required
              />
            </CertificateField>

            <CertificateField
              name="whatsappNumber"
              label="WhatsApp Number"
              error={firstError(fieldErrors.whatsappNumber)}
            >
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07XXXXXXXX"
                aria-invalid={Boolean(fieldErrors.whatsappNumber)}
                required
              />
            </CertificateField>

            <CertificateField
              name="deliveryContactNumber"
              label="Valid Contact Number for Delivery"
              error={firstError(fieldErrors.deliveryContactNumber)}
            >
              <Input
                id="deliveryContactNumber"
                name="deliveryContactNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07XXXXXXXX"
                aria-invalid={Boolean(fieldErrors.deliveryContactNumber)}
                required
              />
            </CertificateField>

            <CertificateField
              name="deliveryAddress"
              label="Full Delivery Address"
              description="Ensure your address is correct and valid for delivery."
              error={firstError(fieldErrors.deliveryAddress)}
            >
              <Textarea
                id="deliveryAddress"
                name="deliveryAddress"
                autoComplete="street-address"
                maxLength={500}
                rows={4}
                aria-invalid={Boolean(fieldErrors.deliveryAddress)}
                required
              />
            </CertificateField>

            <CertificateField
              name="district"
              label="District"
              error={firstError(fieldErrors.district)}
            >
              <Select value={district} onValueChange={(value) => setDistrict(value ?? "")}>
                <SelectTrigger
                  id="district"
                  className="w-full"
                  aria-invalid={Boolean(fieldErrors.district)}
                >
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SRI_LANKA_DISTRICTS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CertificateField>

            <CertificateField
              name={receiptInputId}
              label="Upload Payment Receipt"
              description={`JPG, PNG or PDF up to ${MAX_RECEIPT_SIZE_LABEL}.`}
              error={firstError(fieldErrors.receipt)}
            >
              <input
                id={receiptInputId}
                name="receipt"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                className="peer sr-only"
                aria-invalid={Boolean(fieldErrors.receipt)}
                onChange={(event) => {
                  setReceiptName(event.currentTarget.files?.[0]?.name ?? "");
                  setFieldErrors((current) => ({ ...current, receipt: undefined }));
                }}
                required
              />
              <label
                htmlFor={receiptInputId}
                className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-aria-invalid:border-destructive"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {receiptName ? (
                    <FileTextIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <UploadIcon className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    {receiptName ? "Receipt selected" : "Choose receipt"}
                  </span>
                  <span className="block truncate text-muted-foreground">
                    {receiptName || "Select a JPG, PNG or PDF file"}
                  </span>
                </span>
              </label>
            </CertificateField>

            <Field
              orientation="horizontal"
              data-invalid={Boolean(fieldErrors.confirmation)}
              className="items-start rounded-xl border bg-muted/30 p-4"
            >
              <Checkbox
                id="confirmation"
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(value === true)}
                aria-invalid={Boolean(fieldErrors.confirmation)}
              />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="confirmation">
                  I confirm that the information provided is accurate
                </FieldLabel>
                {fieldErrors.confirmation ? (
                  <FieldError>{firstError(fieldErrors.confirmation)}</FieldError>
                ) : null}
              </div>
            </Field>
          </FieldGroup>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={pending} className="h-11 sm:self-start">
            <SendIcon data-icon="inline-start" />
            {pending ? "Submitting..." : "Submit request"}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function CertificateField({
  name,
  label,
  description,
  error,
  className,
  children,
}: {
  name: string;
  label: string;
  description?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={Boolean(error)} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function firstError(errors: string[] | undefined) {
  return errors?.[0];
}
