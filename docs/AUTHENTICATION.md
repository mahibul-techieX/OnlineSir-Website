# Admin password authentication

The configured owner signs in at `/admin/` using the supplied username and password. Password mode is enabled locally and in the production configuration. No anonymous localhost editorial bypass applies in this mode.

## Storage

The plaintext password is not saved. A random salt and a random server-side pepper are used with HMAC-SHA-256 and PBKDF2-SHA-256 (100,000 iterations). The resulting verifier, salt, pepper and username are stored only in `worker/.dev.vars` locally. That file is Git-ignored and its Windows permissions are limited to the owner account, the local coding sandbox account and SYSTEM. It is not copied into `dist`, content exports or admin backups.

Production must use Cloudflare Worker encrypted secrets: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD_SALT`, `ADMIN_PASSWORD_PEPPER`. Transfer these from the protected local configuration through the Cloudflare dashboard or Wrangler secret input; never put them in wrangler.jsonc, a repository, public storage or chat. The production accounts are not connected yet, so these secrets have not been uploaded.

Keep `AUTH_MODE=password` and `OWNER_EMAIL=support.onlinesir@gmail.com` in production variables. Apply migration 0004. The password mode currently authenticates one owner; the existing Team screen is for identities using the optional Cloudflare Access mode, not additional password accounts. Access can also protect the site as an additional outer login gate, if desired.

## Sessions and abuse protection

- Each login creates a random 256-bit session token. D1 stores its SHA-256 hash, not the token itself.
- Session cookies are HttpOnly, SameSite=Strict and Secure on HTTPS; tokens never enter localStorage. Sessions expire after eight hours.
- Logout deletes the server session and cookie. Changing the password verifier or pepper invalidates existing sessions.
- Atomic D1 counters allow at most 10 login attempts per IP and 50 overall within a fixed 15-minute window. Both correct and incorrect attempts count.
- Login and write endpoints check the request origin. Production password login requires HTTPS. Incorrect usernames/passwords return the same generic error.
- Session and login-limit tables are excluded from downloadable content backups. Expired records are removed during successful logins.

To rotate the password, generate a fresh random salt/pepper and verifier using the exported `passwordHash` helper in `worker/password-auth.mjs`, then update the protected local file and production secrets. Never pass plaintext passwords as command-line arguments. Keep the original password in your own password manager; the stored hash cannot recover it.

Browser regression tests accept an authenticated Playwright storage-state object through `ADMIN_TEST_SESSION` in the test process environment. Keep this transient and revoke the session after tests; do not commit a session file.
