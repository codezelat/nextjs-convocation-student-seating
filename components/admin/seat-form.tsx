import { SaveIcon } from "lucide-react";

import { saveSeatAction } from "@/app/hidden-admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AdminSeatRow } from "@/lib/data/seats";

export function SeatForm({
  seat,
  chrome = "card",
}: {
  seat?: AdminSeatRow;
  chrome?: "card" | "plain";
}) {
  const content = (
    <form action={saveSeatAction} className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sessionNo">Session No</FieldLabel>
          <Input id="sessionNo" name="sessionNo" defaultValue={seat?.sessionNo} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="referenceId">Reference ID</FieldLabel>
          <Input id="referenceId" name="referenceId" defaultValue={seat?.referenceId} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="studentId">Student ID</FieldLabel>
          <Input id="studentId" name="studentId" defaultValue={seat?.studentId} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="seatNo">Seat No</FieldLabel>
          <Input id="seatNo" name="seatNo" defaultValue={seat?.seatNo} required />
        </Field>
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="stageAnnouncingName">
            Stage Announcing Name
          </FieldLabel>
          <Input
            id="stageAnnouncingName"
            name="stageAnnouncingName"
            defaultValue={seat?.stageAnnouncingName}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ticketCategory">Ticket</FieldLabel>
          <Input
            id="ticketCategory"
            name="ticketCategory"
            defaultValue={seat?.ticketCategory}
            maxLength={1}
            pattern="[ABCabc]"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="balconyVisitorSeatNo1">
            Balcony visitor seat 1
          </FieldLabel>
          <Input
            id="balconyVisitorSeatNo1"
            name="balconyVisitorSeatNo1"
            defaultValue={seat?.balconyVisitorSeatNos[0]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="balconyVisitorSeatNo2">
            Balcony visitor seat 2
          </FieldLabel>
          <Input
            id="balconyVisitorSeatNo2"
            name="balconyVisitorSeatNo2"
            defaultValue={seat?.balconyVisitorSeatNos[1]}
          />
        </Field>
      </FieldGroup>
      <Button type="submit" className="w-fit">
        <SaveIcon data-icon="inline-start" />
        Save record
      </Button>
    </form>
  );

  if (chrome === "plain") {
    return content;
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{seat ? "Edit record" : "Manual record"}</CardTitle>
        <CardDescription>
          Add or update a graduate seating record by reference ID.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
