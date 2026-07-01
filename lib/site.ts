const fallbackSiteUrl = "http://localhost:3000";

export const siteName = "SITC Convocation 2026 - Seating Platform";
export const siteDescription =
  "Find SITC Convocation 2026 graduate and visitor seat numbers quickly and securely.";

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl;

  try {
    return new URL(rawUrl);
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}
