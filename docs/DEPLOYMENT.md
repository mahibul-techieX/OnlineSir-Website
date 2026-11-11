# OnlineSir production setup

Confirmed domain: **onlinesir.in**. Owner/contact: **support.onlinesir@gmail.com**.
Initial deployment is live at https://onlinesir.pages.dev. Cloudflare account 8069225effa25b454a53ec21458b26f0 hosts Pages project onlinesir and private Worker onlinesir-admin. Live owner login, database access and logout were verified. Domain connection, private media storage and automated publishing remain pending.

## Account setup

1. Use your own Cloudflare account and add the domain, preserving existing DNS records. Create a **Direct Upload Pages** project named `onlinesir`, production branch `main`, and attach the custom domain. Keep student pages static.
2. Create D1 database `onlinesir`, put its actual ID in `worker/wrangler.jsonc`, and apply migrations with `npx wrangler d1 migrations apply onlinesir --remote --config worker/wrangler.jsonc` after checking the selected account.
3. Pages now proxies only `/api/*` through its ADMIN service binding to onlinesir-admin; student assets remain static. Keep `workers_dev=false`. The binding is configured for production and preview deployments. `public/_routes.json` limits Function execution to API paths. Never deploy the local configuration.
4. Password authentication is the default (`AUTH_MODE=password`). Configure the four password secrets described in AUTHENTICATION.md. Apply migration 0004, which stores expiring session-token hashes and login attempt counters. The login page is public; all editorial APIs require a valid session. HTTPS is required in production.
5. Cloudflare Access is optional extra protection, or an alternative identity mode for multi-user editorial teams. If using Access, configure its team domain/audience, preserve narrow machine-route bypasses for `/api/export`, `/api/export/*`, `/api/publisher/*`, and keep bearer-token protection in the Worker. Never bypass human authorization inside the Worker.
6. Create a **private** GitHub media repository. Set Worker variable `GITHUB_MEDIA_REPO=owner/repository`. Add `GITHUB_MEDIA_TOKEN` as a Worker secret, with Contents read/write limited to that repository. Media uploads are private until included in a release. Do not configure paid R2 for this version.
7. Generate a strong random `RELEASE_EXPORT_TOKEN` locally with a password manager. Add it through `npx wrangler secret put RELEASE_EXPORT_TOKEN --config worker/wrangler.jsonc` and store the same value in the publisher secrets. Never paste tokens into chat or commit them.
8. Deploy the Worker with `npx wrangler deploy --config worker/wrangler.jsonc`. For the first Pages deployment run `npm run build`, then `npx wrangler pages deploy dist --project-name onlinesir --branch main`. The initial content is clearly labelled demonstration material.

## Publish while your computer is off

Push the source into your chosen GitHub repository, retaining `.github/workflows/publish.yml` on its default branch. This does not require making the repository public.

Set repository Actions secrets:

| Secret | Value |
| --- | --- |
| `ADMIN_API_URL` | `https://onlinesir.in` |
| `RELEASE_EXPORT_TOKEN` | Matching Worker secret |
| `CLOUDFLARE_ACCOUNT_ID` | Your actual account ID |
| `CLOUDFLARE_API_TOKEN` | Token scoped to Pages deployment in that account |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | `onlinesir` |

Set Worker variables `GITHUB_PUBLISH_REPO=owner/source-repository`, `GITHUB_PUBLISH_BRANCH=main` (or your actual default branch), and `PUBLISH_RUNNER_ENABLED=true`. Add Worker secret `GITHUB_PUBLISH_TOKEN` with Actions write permission limited to that source repository. The workflow file must exist on the default branch before dispatch works.

The admin Publish button dispatches the workflow. It drains queued releases sequentially, maintains job leases, downloads approved content/media, builds the site and deploys to the Pages production branch `main`. If your Pages production branch differs, set `CLOUDFLARE_PAGES_PRODUCTION_BRANCH` in the workflow environment. Failed dispatches/builds appear in the admin and can be retried. You can also run the workflow manually to drain waiting jobs.

Alternative: omit GitHub publishing variables and run `npm run publisher` on a trusted computer with the environment values in `.env.production.example`. This requires the process to stay online. Environment files are templates; the script does not automatically load them.

## Staying within the free plan

Static student requests do not query D1 or invoke the admin Worker. Cloudflare documents free unlimited static asset requests, making this architecture suitable for the initial 50k monthly visitor target; visitor count alone does not guarantee every service remains free. Monitor storage, Worker/D1 quotas, deployment limits and media repository size.

GitHub standard hosted runners are free for public repositories; private repositories share the account's included usage. Use billing controls to prevent spending above the included allowance, check the account's existing usage, and batch content into releases. Do not change repository visibility just to obtain free compute. No paid plan is required by the code.

References: [Cloudflare static pricing](https://developers.cloudflare.com/pages/functions/pricing/), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Launch verification

- Run `npm run check:config` in the configured publisher environment. It prints readiness only, never credentials. It cannot verify remote Access policies or token permissions.
- Sign in with the owner email; verify an unauthorized identity cannot access admin/API.
- Create a reviewed Assamese note, upload an image/PDF, preview, approve, prepare a release and publish. Verify the public content, search, and attachment URLs.
- Download a complete backup and verify recovery in a separate local installation. Existing settings are preserved during missing-record restore; restore site settings through Settings if recovering into a preinitialized database.
- Test a second release and rollback to the first. Confirm the domain serves the production deployment over HTTPS.
- Replace demonstration notes with reviewed material before advertising complete textbook coverage. Verify textbook editions and permission to publish included material.

Cloudflare account ownership, GitHub account/repository selection, real credential entry, and production smoke testing are still outstanding.
