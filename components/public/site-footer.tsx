import { HeartIcon } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30 px-5 py-4 text-center text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="flex items-center gap-3">
          <Link
            href="https://sitc.lk"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            SITC Campus
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/50">
            /
          </span>
          <Link
            href="https://sitc.lk/privacy-policy/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
        <span className="inline-flex max-w-[17rem] flex-wrap items-center justify-center gap-1.5 leading-6 sm:max-w-none">
          <span>Developed with</span>
          <HeartIcon
            aria-label="love"
            className="size-3.5 fill-rose-500 text-rose-500"
            strokeWidth={2.4}
          />
          <span>from</span>
          <Link
            href="https://codezela.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Codezela Technologies
          </Link>
        </span>
      </div>
    </footer>
  );
}
