import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { CertificateRequestForm } from "@/components/public/certificate-request-form";
import { SiteFooter } from "@/components/public/site-footer";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Graduate Certificate Pack Request",
  description:
    "Request delivery of your SITC Graduate Certificate Pack if you were unable to attend the convocation.",
  alternates: { canonical: "/certificate-request" },
  openGraph: {
    title: "SITC Graduate Certificate Pack Request",
    description:
      "Submit your details and payment receipt for Graduate Certificate Pack delivery.",
    url: "/certificate-request",
    type: "website",
  },
};

export default function CertificateRequestPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SITC Graduate Certificate Pack Request",
    url: absoluteUrl("/certificate-request"),
    isPartOf: {
      "@type": "WebSite",
      name: "SITC Convocation 2026",
      url: absoluteUrl("/"),
    },
  };

  return (
    <main className="public-checked-bg flex min-h-svh w-full max-w-full touch-pan-y flex-col text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col items-center gap-7 px-5 pt-6 pb-12 sm:px-8 sm:pt-8 sm:pb-16">
        <BrandMark href="/" />

        <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
          <h1 className="text-balance font-heading text-3xl font-semibold tracking-normal sm:text-4xl">
            Graduate Certificate Pack Request
          </h1>
          <p className="max-w-2xl text-pretty leading-7 text-muted-foreground">
            For graduates who were unable to attend the convocation. Complete the
            details below to request certificate pack delivery.
          </p>
        </div>

        <div className="w-full min-w-0 max-w-xl rounded-2xl bg-background p-5 shadow-xl shadow-foreground/5 ring-1 ring-border sm:p-7">
          <CertificateRequestForm />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
