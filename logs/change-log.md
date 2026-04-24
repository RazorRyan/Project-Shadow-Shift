# Change Log

## [2026-04-24] Cloudflare Deployment Email Notifications

**Summary:**
Added a Cloudflare Worker that listens for Cloudflare Pages deployment webhook events
(success and failure) and sends an email notification to Ryan.chetty16@gmail.com with
full deployment details (status, environment, project, branch, commit message, deployment
URL, and timestamp).

**Files Changed:**
- `workers/deployment-email-worker.js` — New Worker that validates the webhook secret,
  parses the Pages deployment payload, and sends a formatted HTML + plain-text email via
  the Cloudflare Email Send binding (`SEND_EMAIL`).
- `wrangler.toml` — New Wrangler configuration for the `deployment-email-worker` Worker;
  includes the `SEND_EMAIL` binding declaration. No secrets are stored in this file.
- `docs/cloudflare-deployment-email.md` — New documentation covering setup steps,
  architecture, and testing instructions.
- `logs/change-log.md` — This file; created as the project change log.

**Notes:**
- **Cloudflare manual setup is still required.** The repo contains only the Worker
  source code and config. The following steps must be performed in the Cloudflare
  dashboard or via the Wrangler CLI:
  1. Enable Email Routing for your domain and verify Ryan.chetty16@gmail.com.
  2. Deploy the Worker: `wrangler deploy --config wrangler.toml`.
  3. Add `WEBHOOK_SECRET` as an encrypted secret: `wrangler secret put WEBHOOK_SECRET`.
  4. Configure the Pages project webhook to POST to the Worker URL with the
     `x-webhook-secret` header on deployment success and failure events.
  5. Confirm the `SEND_EMAIL` binding is active in the Worker settings.
- Game engine code, gameplay logic, player/enemy/map/physics/combat/controls files
  were not modified.
