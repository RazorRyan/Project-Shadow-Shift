/**
 * Cloudflare Worker: Deployment Email Notifications
 *
 * Receives a POST webhook from Cloudflare Pages on deployment success/failure
 * and sends a notification email via Cloudflare Email Routing.
 *
 * Required environment bindings (set in Cloudflare dashboard or wrangler.toml):
 *   - WEBHOOK_SECRET  (secret variable)
 *   - SEND_EMAIL      (email send binding)
 */

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const RECIPIENT = "Ryan.chetty16@gmail.com";
const SENDER = "noreply@notifications.projectshadowshift.com";

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Validate webhook secret
    const incomingSecret = request.headers.get("x-webhook-secret");
    if (!incomingSecret || incomingSecret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Safely parse JSON payload
    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Bad Request: invalid JSON", { status: 400 });
    }

    // Extract fields with fallbacks
    const status = payload?.status ?? payload?.deployment?.status ?? "unknown";
    const environment =
      payload?.environment ??
      payload?.deployment?.environment ??
      payload?.deployment?.env ??
      "unknown";
    const projectName =
      payload?.project?.name ??
      payload?.project_name ??
      payload?.deployment?.project_name ??
      "Project Shadow Shift";
    const branch =
      payload?.deployment?.deployment_trigger?.metadata?.branch ??
      payload?.branch ??
      "unknown";
    const commitMessage =
      payload?.deployment?.deployment_trigger?.metadata?.commit_message ??
      payload?.commit_message ??
      payload?.commitMessage ??
      "N/A";
    const deploymentUrl =
      payload?.deployment?.url ??
      payload?.url ??
      payload?.deploymentUrl ??
      "N/A";
    const timestamp =
      payload?.deployment?.created_on ??
      payload?.timestamp ??
      new Date().toISOString();

    // Build email content
    const subject = `Project Shadow Shift - Deployment ${status}`;
    const textBody = [
      `Deployment Notification`,
      ``,
      `Status:          ${status}`,
      `Environment:     ${environment}`,
      `Project:         ${projectName}`,
      `Branch:          ${branch}`,
      `Commit Message:  ${commitMessage}`,
      `Deployment URL:  ${deploymentUrl}`,
      `Timestamp:       ${timestamp}`,
    ].join("\n");

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="border-bottom:2px solid #333;padding-bottom:8px">
    Project Shadow Shift &mdash; Deployment ${status}
  </h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;font-weight:bold;width:160px">Status</td><td style="padding:6px 0">${status}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold">Environment</td><td style="padding:6px 0">${environment}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold">Project</td><td style="padding:6px 0">${projectName}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold">Branch</td><td style="padding:6px 0">${branch}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold">Commit Message</td><td style="padding:6px 0">${commitMessage}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold">Deployment URL</td>
        <td style="padding:6px 0"><a href="${deploymentUrl}">${deploymentUrl}</a></td></tr>
    <tr><td style="padding:6px 0;font-weight:bold">Timestamp</td><td style="padding:6px 0">${timestamp}</td></tr>
  </table>
</body>
</html>`;

    // Build MIME message
    const msg = createMimeMessage();
    msg.setSender({ name: "Project Shadow Shift", addr: SENDER });
    msg.setRecipient(RECIPIENT);
    msg.setSubject(subject);
    msg.addMessage({ contentType: "text/plain", data: textBody });
    msg.addMessage({ contentType: "text/html", data: htmlBody });

    const emailMessage = new EmailMessage(SENDER, RECIPIENT, msg.asRaw());

    try {
      await env.SEND_EMAIL.send(emailMessage);
    } catch (err) {
      console.error("Failed to send email:", err);
      return new Response("Internal Server Error: email send failed", {
        status: 500,
      });
    }

    return new Response("OK", { status: 200 });
  },
};
