# SITC Convocation 2026 Student Seating — Agent Guide

## Overview

A Next.js platform for SITC Campus convocation graduates to look up their seating assignment by Reference ID and share a private ticket-style social card. Built and maintained by Codezela Technologies.

**Domain:** https://sitc.lk  
**Developer:** Codezela Technologies (https://codezela.com)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + `tw-animate-css` + shadcn `"base-nova"` |
| Animations | `motion` (formerly Framer Motion) |
| Database | SQLite (dev) / MySQL (prod) via Prisma 6 |
| Auth | `jose` (HS256 JWTs) + `bcryptjs` |
| Excel | `exceljs` (read + generate `.xlsx`) |
| Images | `sharp` (SVG→PNG social cards with Sinhala font shaping) |
| Receipt storage | Private Backblaze B2 through the S3-compatible API |
| Validation | `zod` |
| Testing | Vitest |
| Package Manager | npm |

---

## Project Structure

```
app/                          # Next.js App Router
├── layout.tsx                # Root layout (Geist fonts, Toaster, SEO metadata)
├── page.tsx                  # Homepage: hero, lookup dialog, footer, JSON-LD
├── globals.css               # Tailwind v4 + shadcn theme variables
├── manifest.ts               # PWA manifest
├── robots.ts                 # robots.txt
├── sitemap.ts                # sitemap.xml
├── opengraph-image.tsx       # Default OG image
├── twitter-image.tsx         # Re-exports OG image
|
├── api/
│   ├── public/search/route.ts        # POST — lookup seat by referenceId
│   ├── public/certificate-requests/route.ts # POST — certificate request intake
│   ├── admin/import/route.ts         # POST — validate + commit Excel upload
│   ├── admin/certificate-requests/   # Authenticated certificate CRUD + receipts
│   └── sample-format/route.ts        # GET — download .xlsx template
|
├── result/[referenceId]/
│   ├── page.tsx                      # SSR seat result card (noindex)
│   ├── opengraph-image.tsx           # Dynamic ticket-style OG PNG via sharp
│   └── twitter-image.tsx             # Re-exports OG image
|
├── certificate-request/page.tsx      # Public certificate pack request form
|
└── hidden-admin/
    ├── layout.tsx                    # noindex admin layout
    ├── page.tsx                      # Login page
    ├── actions.ts                    # Server Actions (login, logout, saveSeat, deleteSeat)
    ├── dashboard/page.tsx            # Seating dashboard: stats, table, CRUD, import
    └── certificate/page.tsx          # Certificate request management

components/
├── brand-mark.tsx                    # Reusable SITC logo + campus name
├── public/
│   ├── lookup-dialog.tsx             # Reference ID search modal (client component)
│   ├── certificate-request-form.tsx  # Shared public/admin certificate form
│   └── site-footer.tsx               # Footer
├── admin/
│   ├── admin-header.tsx              # Shared admin navigation and logout
│   ├── certificate-*.tsx             # Certificate filters, dialogs, actions, status
│   ├── login-form.tsx                # Login form (useActionState)
│   ├── import-panel.tsx              # Excel upload + validate/import UI
│   ├── seat-form.tsx                 # Manual student CRUD form
│   └── seats-table.tsx               # Seating table with bulk selection + status actions
└── ui/                               # shadcn-style primitives

lib/
├── db.ts                             # Singleton PrismaClient (server-only)
├── site.ts                           # Site config: name, description, getSiteUrl()
├── utils.ts                          # cn() utility
├── admin/seat-urls.ts                # Dashboard URL builder shared by server + client
├── data/seats.ts                     # All DB operations
├── data/seat-filters.ts              # Pure status normalization + shared WHERE builder
├── data/certificate-requests.ts      # Certificate queries and mutations
├── auth/session.ts                   # JWT create/verify, cookie management
├── certificates/                     # Validation, receipt checks, service
├── http/rate-limit.ts                # Sliding-window limiter + HMAC client source hash
├── storage/backblaze.ts              # Private B2 storage and signed downloads
└── import/
    ├── excel.ts                      # Workbook parser
    └── seat-workbook.ts              # Header mapping engine + row validation

prisma/
├── schema.prisma                     # SQLite schema
├── schema.mysql.prisma               # MySQL variant
├── seed.ts                           # Admin user seed
├── migrations/                       # DB migrations
└── dev.db*                           # Local SQLite (gitignored)

scripts/
├── setup-db.ts                       # Bootstrap SQLite from migration SQL
└── import-workbook.ts                # CLI: `tsx scripts/import-workbook.ts <file.xlsx>`

tests/
├── import-students.test.ts           # 7 Vitest tests for import validation
└── certificate-requests.test.ts      # 8 request and receipt validation tests
```

---

## Route Map

| Route | Type | Auth | Indexing |
|---|---|---|---|
| `/` | SSR Page | No | ✅ Indexed |
| `/result/[referenceId]` | SSR Page | No | `noindex` (OG reachable) |
| `/certificate-request` | Static Page | No | Indexed |
| `/hidden-admin` | SSR Page | No (form) | `noindex` |
| `/hidden-admin/dashboard` | SSR Page | ✅ JWT | `noindex` |
| `/hidden-admin/certificate` | SSR Page | ✅ JWT | `noindex` |
| `/api/public/search` | POST | No | Blocked |
| `/api/public/certificate-requests` | POST | No | Blocked |
| `/api/admin/import` | POST | ✅ JWT | Blocked |
| `/api/admin/certificate-requests/**` | REST | ✅ JWT | Blocked |
| `/api/sample-format` | GET | No | Blocked |

---

## Key Architecture Patterns

### Public Seat Lookup Flow
1. User enters Reference ID in `LookupDialog` (client component)
2. POST to `/api/public/search` (rate limited: 30 requests/minute per IP) → `findSeatByReference()` (ACTIVE records only) → Prisma `findFirst`
3. On success: `router.push(/result/{referenceId})` → SSR page renders full card

### Seat Status: Active vs Outdated
- Every `StudentSeat` carries `status` (`ACTIVE` | `OUTDATED`) plus `activeReferenceKey` (referenceId when active, `NULL` when outdated)
- The `activeReferenceKey` unique index enforces **at most one ACTIVE record per referenceId at the database level** in both SQLite and MySQL (NULLs are exempt, so any number of outdated rows may share a referenceId)
- Public lookups (`/api/public/search`, result page, OG image) only ever see ACTIVE records
- Bulk selection on the dashboard supports "select all on this page" and Gmail-style "select all N matching records", then mark as outdated or restore to active via `setSeatsStatusAction`
- Archiving always succeeds; restoring a record is skipped and reported as a conflict when a newer ACTIVE record already holds the same referenceId (oldest row wins when duplicates are restored together)
- Excel upsert updates the ACTIVE row per referenceId and leaves outdated rows untouched; manual edit (by id) keeps an outdated record outdated; replace mode deletes everything (including outdated) first

### Social Card Generation
- Custom `sharp` pipeline (not Next.js `ImageResponse`)
- Renders SVG ticket design with embedded base64 NotoSansSinhala fonts
- Proper Sinhala grapheme clustering via `Intl.Segmenter`
- Wraps stage name at ~18 graphemes, max 2 lines

### Admin Auth
- JWT (HS256) in `httpOnly` cookie (`sitc_admin_session`, 8h expiry)
- SameSite=Lax, Secure in production
- `requireAdmin()` → `getAdminSession()` → `jwtVerify()` flow on protected routes/actions
- bcrypt (12 rounds) for password storage

### Certificate Request Flow
1. The public or admin form submits multipart data to its certificate endpoint
2. Zod validates fields and normalizes Sri Lankan phone numbers
3. Receipt validation checks the size and JPG/PNG/PDF binary signature
4. The receipt uploads to the private B2 bucket with SSE-B2 (`AES256`)
5. Prisma creates the request; a failed write triggers receipt cleanup
6. Admin receipt access creates a 60-second signed URL after JWT verification

### Excel Import Pipeline
1. Upload `.xlsx` → `parseSeatWorkbook()` via ExcelJS
2. `buildColumnMap()` — header normalization with Levenshtein fuzzy matching
   - Handles typos: `SEET` → Seat, `Referance` → Reference
   - Detects balcony visitor columns by keyword matching
3. Validate rows: required fields, ticket→visitor seat count rules
4. Two import modes: `upsert` (by referenceId) or `replace` (deleteAll + insert)

### Ticket → Visitor Seat Rules
- **Category A:** Graduate only — no balcony visitors
- **Category B:** Exactly 1 balcony visitor seat
- **Category C:** Exactly 2 balcony visitor seats

---

## Database Schema

### AdminUser
- `id` (String, cuid, PK)
- `email` (String, unique)
- `passwordHash` (String, bcrypt)
- `createdAt` / `updatedAt` (DateTime)

### StudentSeat
- `id` (String, cuid, PK)
- `referenceId` (String, indexed) — public lookup key; NOT globally unique so archived (outdated) rows may repeat it
- `sessionNo`, `studentId`, `seatNo` (String, indexed)
- `stageAnnouncingName` (String) — Sinhala name
- `ticketCategory` (String: A/B/C, indexed)
- `balconyVisitorSeatNos` (String — JSON array of seat strings)
- `programId` (String?, optional) — shown on seating results and e-tickets. It is the final sample workbook column. A blank value in an upsert workbook preserves the existing ID.
- `status` (String: ACTIVE/OUTDATED, default ACTIVE, indexed)
- `activeReferenceKey` (String?, unique) — referenceId when ACTIVE, NULL when OUTDATED
- `createdAt` / `updatedAt` (DateTime)

### CertificateRequest
- `id` (String, cuid, PK)
- `studentId` (String, unique)
- Certificate name, normalized phone numbers, delivery address, and district
- Private receipt object key, original filename, content type, and size
- `status`, optional `internalNote`, optional `courierReference`
- HMAC source hash for public submission rate limiting
- `confirmedAt`, `createdAt`, `updatedAt`

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | `file:./dev.db` or MySQL connection string |
| `ADMIN_EMAIL` | ✅ | Admin login + seed |
| `ADMIN_PASSWORD` | ✅ | Admin password (bcrypt, seed only) |
| `SESSION_SECRET` | ✅ | JWT signing key (≥32 chars) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical domain for OG/sitemap/robots |
| `B2_S3_ENDPOINT` | ✅ | Backblaze B2 S3-compatible endpoint |
| `B2_REGION` | ✅ | B2 bucket region |
| `B2_BUCKET_NAME` | ✅ | Private receipt bucket |
| `B2_KEY_ID` | ✅ | Bucket-scoped application key ID |
| `B2_APPLICATION_KEY` | ✅ | Bucket-scoped application key secret |

---

## Security Measures

| Measure | Implementation |
|---|---|
| Auth | JWT (HS256) in httpOnly cookie |
| Passwords | bcrypt, 12 rounds |
| CSRF | SameSite=Lax |
| HTTPS | Secure flag in production |
| Admin routes | robots.txt + X-Robots-Tag + metadata noindex |
| Result pages | noindex, nofollow, noarchive |
| API routes | robots.txt + X-Robots-Tag |
| Headers | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Permissions-Policy, Referrer-Policy |
| Validation | Zod + manual row validation + server-only DB module |
| File validation | 5 MB cap + binary signature verification |
| Receipt privacy | Private B2 bucket + SSE-B2 + 60-second signed URLs |
| Public abuse control | Honeypot + source-HMAC rate limit (search: 30/min sliding window; certificate requests: 3/hour) |

---

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Production start
npm run lint             # ESLint
npm test                 # Vitest
npm run db:setup         # Bootstrap SQLite DB + seed
npm run db:seed          # Seed admin only
npm run db:generate      # Prisma generate (SQLite)
npm run db:generate:mysql # Prisma generate (MySQL)
npm run db:push:mysql    # Push MySQL schema
npm run db:backfill      # Backfill activeReferenceKey after in-place migration
npm run build:mysql      # MySQL client gen + Next build
npm run import:seats     # CLI: tsx scripts/import-workbook.ts <file.xlsx>
```

---

## Production Deployment

1. Set `NEXT_PUBLIC_SITE_URL` to HTTPS domain
2. Set strong `SESSION_SECRET` (≥32 chars)
3. Set `ADMIN_EMAIL` + `ADMIN_PASSWORD`
4. Set the bucket-scoped B2 variables for the private receipt bucket
5. `npm run db:setup` (SQLite) or `npm run db:generate:mysql && npm run db:push:mysql && npm run db:backfill` (MySQL — the backfill sets `activeReferenceKey` for pre-existing rows)
6. `npm run build` → `npm run start`
7. Seed admin, then remove `ADMIN_PASSWORD` from production secrets

---

## Testing

Currently 28 Vitest tests covering:
- Header normalization (trim/case/blank)
- Alternate column heading aliases
- Typo tolerance across all required headings
- Row-level validation isolation
- Missing required columns detection
- Seat No required field error message
- Ticket category → visitor count validation
- Seat status normalization and the shared status + search WHERE builder
- Rate limiter sliding window, retry times, and client source hashing
- Certificate request validation and Sri Lankan phone normalization
- Unicode certificate names and district validation
- Receipt binary signatures, spoofed types, unsupported files, and size limits

---

## Next.js 16 Notes

This project uses Next.js 16 which has breaking changes from earlier versions. Before modifying any Next.js APIs, check `node_modules/next/dist/docs/` for the current conventions. Do not rely on pre-16 knowledge of Next.js APIs without verification.
