# Zyran.ir

Persian RTL website and backend source for the Zyran Minecraft community.

## Current public state

The Minecraft server and external integrations are not ready yet. The public configuration therefore keeps server status, authentication, feedback, commerce, payment, downloads, Telegram, and Discord disabled. The site must not display fake online counts, fake orders, placeholder payment details, or unverified downloads.

Public feature flags and URLs live in [`assets/config.js`](assets/config.js). Secrets never belong in that file or anywhere in the frontend.

## Frontend

The frontend is static and deploys through GitHub Pages.

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

Run repository checks with:

```bash
npm test
```

## Backend

The deployable Cloudflare Worker + D1 backend is in [`backend/`](backend/). See [`backend/README.md`](backend/README.md) for setup, security details, database migrations, owner promotion, and deployment instructions.

## Safe launch checklist

1. Deploy the backend and verify `/health`.
2. Configure `api.zyran.ir` and exact CORS origins.
3. Create and promote the owner account in D1.
4. Configure the Minecraft host and `_minecraft._tcp` SRV record if the game server is not on the website IP and default port.
5. Connect a trusted status provider and test offline behavior.
6. Add verified Telegram, Discord, donation, and download URLs to `assets/config.js`.
7. Integrate a licensed payment provider and verify callbacks on the backend before enabling ordering.
8. Enable one public feature flag at a time only after its end-to-end test passes.

## Content policy

- No administrative server access is sold as a store product.
- Client-submitted prices are never trusted.
- Unverified launchers or files are not linked.
- If a service is unavailable, the UI says so instead of simulating success.
