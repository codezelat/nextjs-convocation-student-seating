"use client";

import { FormEvent, useState } from "react";
import { UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
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
import { Badge } from "@/components/ui/badge";

type ImportResponse = {
  ok?: boolean;
  committed?: boolean;
  validRows?: number;
  errorCount?: number;
  errors?: Array<{ rowNumber: number; message: string }>;
  error?: string;
};

export function ImportPanel({ chrome = "card" }: { chrome?: "card" | "plain" }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("upsert");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [pending, setPending] = useState<"validate" | "import" | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, commit: boolean) {
    event.preventDefault();
    if (!file) {
      setResult({ error: "Choose an .xlsx file first." });
      return;
    }

    setPending(commit ? "import" : "validate");
    const body = new FormData();
    body.set("file", file);
    body.set("mode", mode);
    body.set("commit", String(commit));

    const response = await fetch("/api/admin/import", {
      method: "POST",
      body,
    });
    const data = (await response.json()) as ImportResponse;
    setResult(data);
    setPending(null);
  }

  const content = (
    <>
      <form className="flex flex-col gap-4" onSubmit={(e) => submit(e, false)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="seat-file">Workbook</FieldLabel>
            <Input
              id="seat-file"
              type="file"
              accept=".xlsx"
              onChange={(event) =>
                setFile(event.currentTarget.files?.[0] ?? null)
              }
            />
            <FieldDescription>
              Program ID is the optional last column. In update mode, a blank
              Program ID keeps the existing value.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Import mode</FieldLabel>
            <Select
              value={mode}
              onValueChange={(value) => {
                if (value) {
                  setMode(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="upsert">Update or add rows</SelectItem>
                  <SelectItem value="replace">Replace all rows</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Update or add rows keeps outdated records untouched and updates
              the active record per reference ID. Replace all rows deletes
              every record (including outdated) before importing.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" variant="outline" disabled={Boolean(pending)}>
            Validate
          </Button>
          <Button
            type="button"
            disabled={Boolean(pending)}
            onClick={(event) =>
              submit(event as unknown as FormEvent<HTMLFormElement>, true)
            }
          >
            <UploadIcon data-icon="inline-start" />
            {pending === "import" ? "Importing..." : "Import"}
          </Button>
          <Button
            nativeButton={false}
            variant="ghost"
            render={<a href="/api/sample-format" />}
          >
            Download sample
          </Button>
        </div>
      </form>

      {result ? (
        <div className="mt-5 rounded-xl bg-muted/60 p-4 text-sm">
          {result.error ? (
            <p className="text-destructive">{result.error}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={result.ok ? "secondary" : "destructive"}>
                  {result.ok ? "Valid" : "Needs fixes"}
                </Badge>
                <Badge variant="outline">{result.validRows ?? 0} valid rows</Badge>
                <Badge variant="outline">{result.errorCount ?? 0} errors</Badge>
                {result.committed ? <Badge>Imported</Badge> : null}
              </div>
              {result.errors?.length ? (
                <ul className="flex max-h-40 flex-col gap-1 overflow-auto text-destructive">
                  {result.errors.map((error) => (
                    <li key={`${error.rowNumber}-${error.message}`}>
                      Row {error.rowNumber}: {error.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </>
  );

  if (chrome === "plain") {
    return content;
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Excel import</CardTitle>
        <CardDescription>
          Validate first, then import when the preview is clean.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
