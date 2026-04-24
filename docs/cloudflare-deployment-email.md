# Cloudflare Deployment Email Notifications

## Overview

This document describes how to set up email notifications for Project Shadow Shift deployments. The repo contains the Worker code only. **All Cloudflare configuration must be performed manually** via the Cloudflare dashboard or CLI.

Whenever a Cloudflare Pages deployment **succeeds** or **fails**, an email is sent to `Ryan.chetty16@gmail.com` with full deployment details.

---

## Architecture

```
Cloudflare Pages deployment
        │
        │  POST webhook (with x-webhook-secret header)
        ▼
deployment-email-worker  (Cloudflare Worker)
        │
        │  Email Routing / Email Send binding (SEND_EMAIL)
        ▼
Ryan.chetty16@gmail.com
```

---

## Files in This Repo

| File | Purpose |
|---|---|
| `workers/deployment-email-worker.js` | Worker source code |
| `wrangler.toml` | Worker configuration (no secrets) |
| `docs/cloudflare-deployment-email.md` | This document |

---

## Manual Cloudflare Setup Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2. Configure Cloudflare Email Routing

1. In the **Cloudflare dashboard**, open your domain → **Email** → **Email Routing**.
2. Enable Email Routing for your domain.
3. Add a **destination address**: `Ryan.chetty16@gmail.com`.
4. Click the verification link sent to that address to verify it.
5. Add a routing rule (or use the catch-all) so that emails sent to your sender address (e.g. `noreply@notifications.projectshadowshift.com`) are forwarded to `Ryan.chetty16@gmail.com`.

> **Note:** The `SENDER` address in the Worker (`noreply@notifications.projectshadowshift.com`) must belong to a domain you control in Cloudflare.

### 3. Deploy the Worker

From the repo root:

```bash
# Deploy using wrangler.toml
wrangler deploy --config wrangler.toml
```

After deployment, copy the **Worker URL** shown in the output (e.g. `https://deployment-email-worker.<your-subdomain>.workers.dev`).

### 4. Add the WEBHOOK_SECRET Environment Variable

Set a strong, random secret — **never commit it to the repo**:

```bash
wrangler secret put WEBHOOK_SECRET --config wrangler.toml
# Enter a long random string when prompted, e.g.:
# openssl rand -hex 32
```

Or set it in the dashboard: **Workers & Pages → deployment-email-worker → Settings → Variables → Add variable (Encrypt)**.

### 5. Configure the Cloudflare Pages Webhook

1. In the Cloudflare dashboard, go to **Workers & Pages** → select the **Project Shadow Shift** Pages project.
2. Open **Settings** → **Notifications** (or **Webhooks**, depending on your plan/UI).
3. Click **Add webhook**.
4. Set the **URL** to the Worker URL from step 3.
5. Enable triggers for:
   - **Deployment succeeded**
   - **Deployment failed**
6. Add a custom header:
   - **Header name:** `x-webhook-secret`
   - **Header value:** the same secret you set in step 4.
7. Save.

### 6. Verify the Email Binding

Ensure the `SEND_EMAIL` binding is active:

1. Dashboard → **Workers & Pages → deployment-email-worker → Settings → Bindings**.
2. Confirm an **Email Send** binding named `SEND_EMAIL` is listed.
3. If not, add it manually pointing to your verified Email Routing destination.

---

## Testing

1. Push a commit to the repository to trigger a Pages deployment.
2. Wait for the deployment to complete (succeed or fail).
3. Check `Ryan.chetty16@gmail.com` for an email with the subject:
   `Project Shadow Shift - Deployment <status>`
4. If no email arrives, check **Worker logs** in the dashboard under **Workers & Pages → deployment-email-worker → Logs**.

---

## Email Contents

Each notification includes:

| Field | Description |
|---|---|
| Status | `success`, `failure`, etc. |
| Environment | `production`, `preview`, etc. |
| Project | Pages project name |
| Branch | Git branch that triggered deployment |
| Commit Message | The HEAD commit message |
| Deployment URL | Direct URL to the deployed site |
| Timestamp | ISO 8601 deployment creation time |

---

## Security Notes

- `WEBHOOK_SECRET` is never stored in the repository; it lives only in Cloudflare's encrypted secret store.
- The Worker rejects any request without a valid `x-webhook-secret` header with `401 Unauthorized`.
- Non-POST requests are rejected with `405 Method Not Allowed`.
