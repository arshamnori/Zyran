# Zyran API

Secure Cloudflare Worker + D1 backend for authentication, feedback, orders, account pages, and the admin panel.

## Security model

- Passwords: PBKDF2-SHA-256 with a unique salt and 310,000 iterations.
- Sessions: opaque random tokens; only SHA-256 digests are stored in D1.
- Browser session: `HttpOnly`, `Secure`, `SameSite=Strict` cookie. No auth token is stored in `localStorage`.
- CORS: explicit origin allowlist with credential support.
- Authorization: every admin endpoint checks the server-side database role.
- Rate limits: registration, login, feedback, and order creation.
- Pricing: order totals are calculated from active packs in D1; client prices are ignored.
- Output: JSON only, with restrictive security headers.

## Local setup

```bash
cd backend
npm install
cp wrangler.toml.example wrangler.toml
# Create a local DB from migrations
npm run db:migrate:local
npm run dev
```

The public frontend remains in maintenance mode until deployment is complete. Do not enable a flag in `assets/config.js` before its service is actually reachable.

## Cloudflare deployment

1. Authenticate Wrangler:
   ```bash
   npx wrangler login
   ```
2. Create D1:
   ```bash
   npx wrangler d1 create zyran-db
   ```
3. Copy the returned `database_id` into a local `wrangler.toml` copied from `wrangler.toml.example`.
4. Apply migrations:
   ```bash
   npm run db:migrate:remote
   ```
5. Deploy:
   ```bash
   npm run deploy
   ```
6. In Cloudflare, map the Worker custom domain to `api.zyran.ir`.
7. Register the owner through the frontend, then promote that account directly in D1:
   ```bash
   npx wrangler d1 execute zyran-db --remote \
     --command "UPDATE users SET role='admin' WHERE username_normalized='OWNER_USERNAME_LOWERCASE'"
   ```
8. Verify `https://api.zyran.ir/health`, CORS, login/logout, and admin authorization.
9. Set the matching feature flags in `assets/config.js` to `true` and deploy the frontend.

## Server status

Keep `SERVER_READY="false"` until the Minecraft server and DNS are ready. Then set:

- `SERVER_READY="true"`
- `STATUS_PROVIDER_URL` to a trusted JSON endpoint returning either:
  - `{ "online": true, "playersOnline": 4, "maxPlayers": 200, "version": "..." }`, or
  - the common `{ "online": true, "players": { "online": 4, "max": 200 }, "version": { "name": "..." } }` shape.

The API fails closed: status provider errors are displayed as offline/unavailable, never as a random online count.

## Orders and payments

`ORDERING_ENABLED` defaults to `false`. The API can securely create pending orders and calculates prices server-side, but it intentionally does **not** claim that payment succeeded. Before enabling orders, integrate a licensed payment provider, verify callbacks server-side, and only transition an order to `paid` after signature verification.

Never commit `wrangler.toml` if it contains account-specific IDs, `.dev.vars`, API keys, bot tokens, or payment secrets.
