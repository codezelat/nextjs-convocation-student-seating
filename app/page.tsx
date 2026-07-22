import Image from "next/image";

import { BrandMark } from "@/components/brand-mark";
import { LookupDialog } from "@/components/public/lookup-dialog";
import { SiteFooter } from "@/components/public/site-footer";
import { absoluteUrl, siteDescription, siteName } from "@/lib/site";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    description: siteDescription,
    url: absoluteUrl("/"),
    applicationCategory: "EducationApplication",
    operatingSystem: "Any",
    creator: {
      "@type": "EducationalOrganization",
      name: "SITC Campus",
      url: "https://sitc.lk",
    },
  };

  return (
    <main className="public-checked-bg flex min-h-dvh flex-col text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-5 py-5 text-center sm:px-8 lg:py-6 [@media(max-height:720px)]:py-3">
        <BrandMark />

        <div className="mt-5 w-full max-w-xl overflow-hidden rounded-2xl bg-muted shadow-2xl shadow-foreground/10 ring-1 ring-border [@media(max-height:720px)]:mt-3 [@media(max-height:720px)]:max-w-lg">
          <Image
            src="/images/sitc-convocation-hero.png"
            alt="SITC Campus convocation award presentation"
            width={686}
            height={386}
            priority
            className="aspect-video w-full object-cover"
          />
        </div>

        <div className="mt-5 flex max-w-2xl flex-col items-center gap-3 [@media(max-height:720px)]:mt-3 [@media(max-height:720px)]:gap-2">
          <h1 className="text-balance font-heading text-3xl font-semibold tracking-normal sm:text-4xl">
            SITC Convocation 2026
          </h1>
          <div className="rounded-full border bg-muted/50 px-4 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Seating Platform
          </div>
          <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            ඔබේ උපාධි ප්‍රදානෝත්සවයේ ආසන අංකය ඉක්මනින් දැනගන්න
          </p>
          <div className="pt-1">
            <LookupDialog />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
