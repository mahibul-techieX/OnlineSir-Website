# Implementation status — 10 November 2026

## Current milestone: functional local admin

The admin now includes persistent notes, autosave, recovery, revisions, duplication, review/approval/archive, curriculum hierarchy, image/PDF uploads, media insertion, settings, corrections, team permissions, audit history and complete ZIP backup/restore.

The Publish button now runs a real local build, tracks its result and updates the local website after success. Previous approved content remains published while newer drafts are edited. Older snapshots can be republished for rollback. Publishing jobs have leases, heartbeats and retry handling.

Production Cloudflare/GitHub accounts, Access login, DNS and the production publishing runner still require connection. No paid subscription or public deployment has been created. The runner can operate on the owner's computer at no extra service charge while it is online. See README for configuration and limits.

Separate book/edition public routes and a large-library Pagefind search UI remain website enhancements. Reviewed real lessons and Assamese proofreading remain required. The traffic target has not been load-tested in production.

## Previous milestone (superseded by the current status above)

The first working local version is available. The long-term project plan remains broader than this initial implementation.

## Working locally

- Responsive Assamese-first homepage using the provided navy/green branding and optimized original logo assets.
- Classes 5–10, subject navigation, chapter reading, text notes, search filters, print, bookmarks and copy-link.
- Four explicitly labelled demonstration notes. Classes without content have honest empty states.
- Admin editor stores notes in local D1, organizes class/subject/book/edition/chapter metadata, imports/exports text/Markdown and previews sanitized formatting.
- Draft/review/approved/archive workflow; conflict checks; immutable release snapshots; export-to-static-build command.
- Owner-only production authentication code validates Cloudflare Access JWTs. Production configuration is intentionally unset and fails closed.
- Sample notes seeded into the local editor. Browser tests leave their own resources archived; the default list hides archived resources.

## Verified

- Production static build: 21 HTML pages plus sitemap and Pagefind index.
- Five unit tests pass (sanitization, Assamese rendering, validation, local authentication boundary, routes).
- Three browser tests pass (browsing/search/bookmark, mobile overflow, persistent admin/review/release workflow).
- Integration checks reject stale versions and cross-origin writes; exported release content survives later archival unchanged.
- Desktop screenshots reviewed; 390px mobile website and admin fit the viewport; no uncaught browser errors in capture runs.
- Dependency installation audit reported zero vulnerabilities after upgrading to Astro 7.4.8 and sharp 0.35.5.

## Remaining before a full public launch

- Actual Cloudflare/GitHub accounts, domain/DNS, production D1, Access owner identity and deployed Worker routing.
- Real reviewed notes, official curriculum inventory, Assamese proofreading, contact details and final policies.
- End-to-end automated publish/deployment tracking; backup scheduling and restore drill.
- PDF/image media uploads, multi-user permissions, full curriculum ordering/management, editor autosave, structured question editor and book/edition-specific URLs.
- Connect the generated Pagefind index to the search UI for a large library; the pilot currently uses a small client-side full-text filter.
- Measured load/performance testing before claiming capacity at 50,000 monthly visitors. The current static design targets that traffic, but no production traffic test has been performed.

## Start

Run `npm run start:local` from the project folder. Website: `http://127.0.0.1:4321/`. Admin: `http://127.0.0.1:4321/admin/`. Detailed operation and production checklist: `README.md`.

No website has been deployed publicly and no paid service has been enabled.
