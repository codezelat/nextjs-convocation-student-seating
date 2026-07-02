import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, TicketIcon, UserIcon, UsersIcon } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/public/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findSeatByReference } from "@/lib/data/seats";

type ResultPageProps = {
  params: Promise<{ referenceId: string }>;
};

export async function generateMetadata({
  params,
}: ResultPageProps): Promise<Metadata> {
  const { referenceId } = await params;
  const encodedReference = encodeURIComponent(referenceId);
  const seat = await findSeatByReference(decodeURIComponent(referenceId));
  const shareName = formatShareName(seat?.stageAnnouncingName);
  const title = shareName
    ? `${shareName} - SITC Convocation 2026 Seating Pass`
    : "SITC Convocation 2026 Seating Pass";

  return {
    title: `Seat Result ${referenceId.toUpperCase()}`,
    description: "Open your SITC Convocation 2026 seating pass.",
    alternates: {
      canonical: `/result/${encodedReference}`,
    },
    openGraph: {
      title,
      description: "A private, shareable seating pass for SITC Convocation 2026.",
      url: `/result/${encodedReference}`,
      type: "website",
      images: [
        {
          url: `/result/${encodedReference}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "SITC Convocation 2026 seating pass",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "A private, shareable seating pass for SITC Convocation 2026.",
      images: [`/result/${encodedReference}/twitter-image`],
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

export default async function ResultPage({
  params,
}: ResultPageProps) {
  const { referenceId } = await params;
  const seat = await findSeatByReference(decodeURIComponent(referenceId));

  if (!seat) {
    notFound();
  }

  const visitorLabel =
    seat.ticketCategory === "A"
      ? "Graduate only"
      : seat.ticketCategory === "B"
        ? "1 visitor"
        : "2 visitors";

  return (
    <main className="public-checked-bg flex min-h-dvh flex-col text-foreground">
      <section className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <BrandMark href="/" />
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/" />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
          </div>

          <Card className="rounded-2xl shadow-xl shadow-foreground/5">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Your convocation seat
                  </CardTitle>
                  <CardDescription>
                    Reference {seat.referenceId}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="w-fit">
                  Ticket {seat.ticketCategory} - {visitorLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoTile label="Session No" value={seat.sessionNo} />
                <InfoTile label="Student ID" value={seat.studentId} />
                <InfoTile label="Seat No" value={seat.seatNo} />
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <UserIcon aria-hidden="true" />
                  Stage Announcing Name
                </div>
                <p className="text-pretty text-2xl font-semibold leading-9">
                  {seat.stageAnnouncingName}
                </p>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TicketIcon aria-hidden="true" />
                  Ticket
                </div>
                <div className="text-xl font-semibold">
                  Category {seat.ticketCategory}
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <UsersIcon aria-hidden="true" />
                  Balcony Visitors Seat No
                </div>
                {seat.balconyVisitorSeatNos.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {seat.balconyVisitorSeatNos.map((visitorSeat) => (
                      <Badge
                        key={visitorSeat}
                        variant="outline"
                        className="rounded-xl border-primary/30 bg-background px-4 py-2 text-base font-semibold text-foreground shadow-sm"
                      >
                        {formatBalconySeat(visitorSeat)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No balcony visitor seat for category A.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-4 text-left">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 break-words text-lg font-semibold">{value}</div>
    </div>
  );
}

function formatBalconySeat(value: string) {
  return value.trim().toLowerCase().startsWith("balcony")
    ? value
    : `Balcony ${value}`;
}

function formatShareName(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  const graphemes = splitGraphemes(trimmed);
  const maxLength = 42;

  if (graphemes.length <= maxLength) {
    return trimmed;
  }

  return `${graphemes.slice(0, maxLength - 1).join("").trim()}...`;
}

function splitGraphemes(value: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("si", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (segment) => segment.segment);
  }

  return Array.from(value);
}
