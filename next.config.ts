import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["skia-canvas"],
  outputFileTracingIncludes: {
    "/result/\\[referenceId\\]/{e-ticket,opengraph-image,twitter-image}": [
      "./lib/tickets/assets/fonts/**/*",
      "./public/fonts/NotoSansSinhala-*.ttf",
      "./public/fonts/NotoSansTamil-Regular.ttf",
      "./node_modules/@skia-canvas/**/skia.node",
    ],
    "/result/\\[referenceId\\]/e-ticket": ["./lib/tickets/assets/template.jpg"],
  },
  env: {
    NEXT_PUBLIC_SPLIT_RECEIPT_UPLOADS: process.env.VERCEL === "1" ? "1" : "0",
  },
  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
    ];

    const noIndexHeaders = [
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      },
    ];
    const privateHeaders = [
      ...noIndexHeaders,
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/api/admin/:path*",
        headers: privateHeaders,
      },
      {
        source: "/api/public/:path*",
        headers: privateHeaders,
      },
      {
        source: "/hidden-admin/:path*",
        headers: privateHeaders,
      },
      {
        source: "/result/:path*",
        headers: privateHeaders,
      },
    ];
  },
};

export default nextConfig;
