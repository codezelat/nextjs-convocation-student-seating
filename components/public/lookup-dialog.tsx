"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SearchIcon } from "lucide-react";

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LookupDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const response = await fetch("/api/public/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId }),
    });

    setPending(false);

    if (!response.ok) {
      setError("Reference ID not found. Please check and try again.");
      return;
    }

    const data = (await response.json()) as { referenceId: string };
    setOpen(false);
    router.push(`/result/${encodeURIComponent(data.referenceId)}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            className="h-12 gap-2 rounded-full px-6 text-base shadow-lg shadow-primary/10"
          />
        }
      >
        <SearchIcon aria-hidden="true" className="size-3.5" />
        <span>Search My Seat</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <DialogHeader>
            <DialogTitle>Find your seat</DialogTitle>
            <DialogDescription>
              Enter the reference ID printed on your convocation notice.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="referenceId">Reference ID</FieldLabel>
                <Input
                  id="referenceId"
                  name="referenceId"
                  autoComplete="off"
                  placeholder="J1003"
                  value={referenceId}
                  onChange={(event) =>
                    setReferenceId(event.currentTarget.value.toUpperCase())
                  }
                  aria-invalid={Boolean(error)}
                  required
                />
                <FieldDescription>Example: J1003</FieldDescription>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={pending} className="h-10">
              {pending ? "Searching..." : "Search"}
            </Button>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
