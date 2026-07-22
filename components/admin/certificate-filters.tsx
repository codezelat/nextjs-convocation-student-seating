"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CERTIFICATE_REQUEST_STATUSES,
  CERTIFICATE_STATUS_LABELS,
} from "@/lib/certificates/constants";

export function CertificateFilters({
  query,
  status,
}: {
  query: string;
  status: string;
}) {
  return (
    <form className="flex max-w-3xl flex-col gap-2 sm:flex-row">
      <Input
        name="q"
        defaultValue={query}
        placeholder="Search student, name, contact or district"
        className="sm:flex-1"
      />
      <StatusFilter defaultValue={status} />
      <Button type="submit" variant="outline" className="sm:w-28">
        <SearchIcon data-icon="inline-start" />
        Search
      </Button>
    </form>
  );
}

function StatusFilter({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Select name="status" value={value} onValueChange={(nextValue) => setValue(nextValue ?? "ALL")}>
      <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
        <SelectValue>
          {value === "ALL"
            ? "All statuses"
            : CERTIFICATE_STATUS_LABELS[
                value as keyof typeof CERTIFICATE_STATUS_LABELS
              ]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="ALL">All statuses</SelectItem>
          {CERTIFICATE_REQUEST_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {CERTIFICATE_STATUS_LABELS[item]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
