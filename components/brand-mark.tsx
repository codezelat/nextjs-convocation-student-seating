import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  href,
}: {
  className?: string;
  href?: string;
}) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-14 w-44 overflow-hidden rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-border">
        <Image
          src="/images/sitc-logo.jpg"
          alt="SITC Campus"
          fill
          priority
          sizes="176px"
          className="object-contain p-2"
        />
      </div>
      <div className="sr-only leading-none">
        <div className="font-heading text-2xl font-semibold tracking-normal">
          SITC
        </div>
        <div className="mt-1 text-xs font-medium uppercase text-muted-foreground">
          Campus
        </div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      aria-label="SITC Campus home"
      className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
