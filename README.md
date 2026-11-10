# OnlineSir

Assamese-first educational website with a functional editorial admin panel. Public pages are static; editorial data lives in D1. Initial traffic target: 50,000 monthly visitors.

## Start locally

Use a supported Node.js release (tested with Node 25.2.1).

```sh
npm ci
npm run start:local
```

This applies local migrations and starts the website, D1/media emulator and publishing worker. Open `http://127.0.0.1:4321/admin/`. Stop with Ctrl+C. Local development uses an owner identity on loopback only. It creates no paid storage subscription. `worker/wrangler.local.jsonc` is exclusively for local development; production uses `worker/wrangler.jsonc`.

Optional: `npm run seed:local` adds labelled sample notes, skipping existing slugs.

## Admin workflows

- **Overview:** real draft, review, approval and media counts.
- **Notes & solutions:** class/subject/book/chapter metadata, curriculum chapter selection, Markdown formatting, tables, image/PDF insertion, safe preview, text import/export, SEO fields, sample labels, autosave, browser recovery, search, filters and pagination.
- **Review:** draft/review/approve/archive/unarchive/duplicate; revision history and restoration as a new draft. Version checks reject stale edits. The last approved version stays in releases while a newer draft is edited.
- **Curriculum:** ordered Classes 5–10 → subjects → books/editions → chapters. Parent types and reference checks prevent accidental archival. Renaming curriculum does not silently rewrite existing note snapshots; reselect the chapter and save to adopt changes.
- **Media:** PNG/JPEG/WebP up to 2 MB; PDF up to 5 MB. Edit names/alt text, preview, insert and archive unused files. Initial total allowance: 250 MB, including archived bytes retained for rollback and backups.
- **Publishing:** prepare an immutable snapshot, publish, follow queued/building/published/failed status, retry, and republish an earlier snapshot to roll back. Archiving removes a note from future releases.
- **Corrections:** log editorial feedback and resolve/reopen it.
- **Settings:** site name, tagline, session, contact email and announcement; changes apply with the next release. Supplied logo assets remain unchanged.
- **Team:** editors write drafts, reviewers approve/publish, owner manages access/settings/backups. Permissions are checked in the API. Production users also require permission in Cloudflare Access.
- **Backups:** ZIP of database records plus all media. Restore merges missing records without overwriting newer data, then restores missing media under original URLs. Credentials and team access are excluded. Interactive restore limits: 300 MB archive/uncompressed total, 15 MB database manifest, and at most 45 SQL statements. Keep off-device copies.
- **Activity:** recent editorial audit records.

## Publishing

The local publisher polls a leased queue, exports one release, downloads its referenced media, builds Astro/Pagefind under `artifacts/releases/<job-id>/site`, and updates local content only after success. Jobs have 15-minute leases with heartbeats; abandoned jobs become retryable failures. Only one build runs at a time. Errors appear in the publishing panel.

Published attachments are public. Archiving does not retract downloaded copies or immediately remove all historical static attachment URLs. The archive action preserves bytes needed by old releases and backups.

Public resource paths remain `/class-N/subject/resource-slug/`; use unique slugs across textbook editions. Separate edition route pages remain a website enhancement. The pilot search UI uses client-side filtering; Pagefind indexes are generated for a later large-library UI switch.

## Production setup — not connected yet

No paid subscription, repository or public deployment was created by this implementation.

1. Create D1, replace the placeholder ID in `worker/wrangler.jsonc`, and apply migrations using `--remote` only after confirming the intended Cloudflare account.
2. Configure `APP_ORIGIN`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` and `OWNER_EMAIL`. Protect `/admin/*` and `/api/*` with Cloudflare Access. Keep `workers_dev=false`; do not set `LOCAL_DEVELOPMENT` in production. Add team identities to both the Access policy and the Team screen.
3. Connect a private GitHub media repository using `GITHUB_MEDIA_REPO=owner/repository` and secret `GITHUB_MEDIA_TOKEN` restricted to its contents. Production uploads do not require R2. Monitor Git history growth as well as current library size.
4. Route `/api/*` to the Worker while keeping student reading on static Pages delivery. Configure Pages, custom domain, HTTPS and existing DNS/email records carefully.
5. Configure random `RELEASE_EXPORT_TOKEN` as a Worker secret. A trusted build runner needs the matching token plus `ADMIN_API_URL`, `CLOUDFLARE_PAGES_PROJECT_NAME`, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Scope the token to the intended deployment. Allow machine routes `/api/export*` and `/api/publisher/*` through Access with their Worker bearer-token protection; human admin routes still require Access JWTs.
6. Run `npm run publisher` in a trusted persistent Node process. It builds the immutable release and deploys with Wrangler Pages, marking success only after the deploy command succeeds. Set Worker `PUBLISH_RUNNER_ENABLED=true` once connected. Running this on your own computer avoids an extra hosting subscription but requires that computer to remain online. Always-on hosted CI is a separate infrastructure choice. An unconfigured production Publish button reports a configuration error.
7. Supply reviewed educational material, Assamese proofreading, policies and contact details. Verify production login, upload, publishing, backup recovery and rollback before launch.

Secrets belong in provider/environment settings, never source files. `.dev.vars` and `.env` are ignored. Keep downloaded backups private.

## Verification commands

- `npm test`: SQL-backed Worker/API tests plus sanitization, validation and permission tests.
- `npm run test:e2e`: with local services running, Google Chrome tests student journeys, editor persistence/autosave, curriculum, media, backups, corrections, settings, team UI and a real local publish.
- `npm run build`: production build plus Pagefind.
- `node scripts/capture-preview.mjs`: screenshots and browser-error/mobile-overflow checks.

Test notes are identifiable and archived. Tests do not deploy externally. Production provider integrations require verification against your accounts.
