import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/public/site-footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="public-checked-bg flex min-h-dvh flex-col text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-7 px-5 py-10 text-center sm:px-8">
        <BrandMark href="/" />
        <div className="flex max-w-lg flex-col items-center gap-3">
          <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            404
          </span>
          <h1 className="text-balance font-heading text-3xl font-semibold tracking-normal sm:text-4xl">
            Page not found
          </h1>
          <p className="text-pretty leading-7 text-muted-foreground">
            The page you requested does not exist or has moved.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to home
        </Button>
      </section>
      <SiteFooter />
    </main>
  );
}
