// =====================================================================
// notify-application — Supabase Edge Function
//
// Two jobs:
//   1. Database Webhook on INSERT into careers_applications — emails the
//      application to whoever the job (or Settings) says, and sends the
//      applicant a confirmation.
//   2. Manual resend from the admin panel — POST { resend: { application_id,
//      to: ["a@b.com"] } } with the admin's Authorization header. Only an
//      HR admin signed in with 2FA can do this.
//
// The application is always re-read from the database, so the request body
// can never dictate the content of the email.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   SENDGRID_API_KEY        — SendGrid key with "Mail Send" permission
//   CAREERS_FROM_EMAIL      — e.g. careers@nuway.com.au (verified sender)
//   CAREERS_ADMIN_URL       — e.g. https://nuway.com.au/wp-content/uploads/careers/admin/
//   CAREERS_WEBHOOK_SECRET  — optional; if set, the webhook must send it as
//                             the x-careers-secret header
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// The head-office CC lives in the careers_settings table (Admin > Settings),
// with CAREERS_CC_EMAIL as a fallback.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;
const FROM = Deno.env.get("CAREERS_FROM_EMAIL") ?? "careers@nuway.com.au";
const CC_FALLBACK = Deno.env.get("CAREERS_CC_EMAIL") ?? "";
const ADMIN_URL = Deno.env.get("CAREERS_ADMIN_URL") ?? "";
const WEBHOOK_SECRET = Deno.env.get("CAREERS_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const emails = (t: unknown): string[] =>
  String(t ?? "").split(/[,;\s]+/).map((x) => x.trim())
    .filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));

const row = (label: string, value: unknown) =>
  value === null || value === undefined || value === "" || value === false
    ? ""
    : `<tr><td style="padding:6px 12px 6px 0;color:#263D42;font-weight:600;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:6px 0;color:#191919">${esc(value === true ? "Yes" : value)}</td></tr>`;

async function send(payload: Record<string, unknown>) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-careers-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let logRow: Record<string, unknown> | null = null;
  try {
    const body = await req.json();
    const isResend = !!body?.resend;

    // ---------------- who is asking, and for what ----------------
    let applicationId: string | undefined;
    let manualTo: string[] = [];
    let sentBy = "system";

    if (isResend) {
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!token) return new Response("Sign in required", { status: 401, headers: cors });
      const asUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: isAdmin } = await asUser.rpc("careers_is_admin");
      if (!isAdmin) return new Response("Admins only", { status: 403, headers: cors });
      const { data: who } = await asUser.auth.getUser();
      sentBy = who?.user?.email ?? "admin";
      applicationId = body.resend.application_id;
      manualTo = emails((body.resend.to ?? []).join(","));
      if (!manualTo.length) return new Response("No valid recipients", { status: 400, headers: cors });
    } else {
      if (WEBHOOK_SECRET && req.headers.get("x-careers-secret") !== WEBHOOK_SECRET) {
        return new Response("Bad secret", { status: 401, headers: cors });
      }
      applicationId = body?.record?.id;
    }
    if (!applicationId) return new Response("No application id", { status: 400, headers: cors });

    // ---------------- read everything from the database ----------------
    const { data: a, error: aErr } = await admin
      .from("careers_applications").select("*").eq("id", applicationId).single();
    if (aErr || !a) return new Response("Application not found", { status: 404, headers: cors });

    const [{ data: job }, { data: loc }, { data: settings }] = await Promise.all([
      a.job_id
        ? admin.from("careers_jobs").select("title, email_mode, email_others").eq("id", a.job_id).single()
        : Promise.resolve({ data: null }),
      a.location_id
        ? admin.from("careers_locations").select("name, hiring_email, store_email").eq("id", a.location_id).single()
        : Promise.resolve({ data: null }),
      admin.from("careers_settings").select("*").eq("id", true).maybeSingle(),
    ]);

    // ---------------- recipients ----------------
    const storeEmail = loc?.hiring_email || loc?.store_email || "";
    const mode = job ? (job.email_mode ?? "store") : (settings?.interest_email_mode ?? "store");
    const others = job ? job.email_others : settings?.interest_email_others;
    const cc = (settings?.cc_email ?? CC_FALLBACK ?? "").trim();

    let to: string[];
    if (isResend) {
      to = manualTo;
    } else if (mode === "others_only") {
      to = emails(others);
    } else if (mode === "store_and_others") {
      to = [...emails(storeEmail), ...emails(others)];
    } else {
      to = emails(storeEmail);
    }
    if (!to.length) to = emails(cc || FROM);           // never lose an application
    to = [...new Set(to.map((e) => e.toLowerCase()))];

    logRow = { application_id: a.id, recipients: to.join(", "), kind: isResend ? "resend" : "auto", sent_by: sentBy };

    // ---------------- CV attachment ----------------
    const attachments: Array<Record<string, string>> = [];
    if (a.cv_path) {
      const { data: file } = await admin.storage.from("careers-cvs").download(a.cv_path);
      if (file) {
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        attachments.push({
          content: btoa(bin),
          filename: a.cv_filename || "cv.pdf",
          type: file.type || "application/octet-stream",
          disposition: "attachment",
        });
      }
    }

    // ---------------- the email ----------------
    const what = job ? `Application: ${job.title}` : `Register interest: ${(a.role_types ?? []).join(", ") || "any role"}`;
    const subject = `${isResend ? "[Forwarded] " : ""}${what} — ${a.first_name} ${a.last_name}${loc ? ` (${loc.name})` : ""}`;

    const html = `
<div style="font-family:Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;color:#191919">
  <div style="background:#1B9AAA;padding:20px 24px;color:#fff;font-size:22px;font-weight:700">Nuway Careers — ${isResend ? "forwarded" : "new"} ${job ? "application" : "expression of interest"}</div>
  <div style="padding:24px;border:1px solid #e3e8ea;border-top:0">
    ${isResend ? `<p style="margin:0 0 16px;color:#6b7c82;font-size:14px">Forwarded by ${esc(sentBy)} from the careers admin.</p>` : ""}
    <p style="font-size:18px;margin:0 0 4px"><strong>${esc(a.first_name)} ${esc(a.last_name)}</strong></p>
    <p style="margin:0 0 16px;color:#263D42">${job ? esc(job.title) : "General interest"}${loc ? " · " + esc(loc.name) : ""}</p>
    <table style="border-collapse:collapse;font-size:15px">
      ${row("Email", a.email)}
      ${row("Phone", a.phone)}
      ${row("Suburb", a.suburb)}
      ${row("Interested in", (a.role_types ?? []).join(", "))}
      ${row("Availability", (a.employment_types ?? []).join(", "))}
      ${row("Weekends", a.weekends)}
      ${row("Can start", a.start_date)}
      ${row("Licence", a.licence_class ? `${a.licence_class}${a.licence_auto_only ? " (auto only)" : ""}` : "")}
      ${row("Forklift ticket", a.forklift)}
      ${row("Loader ticket", a.loader)}
      ${row("White card", a.white_card)}
      ${row("Working rights", a.working_rights)}
      ${row("Visa details", a.visa_details)}
      ${row("Received", new Date(a.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }))}
    </table>
    ${a.message ? `<p style="margin:20px 0 6px;font-weight:600;color:#263D42">Message</p><p style="white-space:pre-wrap;margin:0">${esc(a.message)}</p>` : ""}
    <p style="margin:24px 0 0">${a.cv_path ? "CV attached." : "No CV uploaded."}${ADMIN_URL ? ` <a href="${esc(ADMIN_URL)}#applicants/${esc(a.id)}" style="color:#1B9AAA">Open in admin</a>` : ""}</p>
  </div>
  <p style="font-size:12px;color:#6b7c82;padding:12px 24px">Sent automatically by the Nuway careers page. Reply to this email to contact the applicant directly.</p>
</div>`;

    const personalizations: Record<string, unknown> = { to: to.map((email) => ({ email })) };
    const ccList = emails(cc).filter((e) => !to.includes(e.toLowerCase()));
    if (ccList.length) personalizations.cc = ccList.map((email) => ({ email }));

    await send({
      personalizations: [personalizations],
      from: { email: FROM, name: "Nuway Careers" },
      reply_to: { email: a.email, name: `${a.first_name} ${a.last_name}` },
      subject,
      content: [{ type: "text/html", value: html }],
      attachments: attachments.length ? attachments : undefined,
    });

    // ---------------- confirmation to the applicant (first send only) ----
    if (!isResend) {
      await send({
        personalizations: [{ to: [{ email: a.email, name: `${a.first_name} ${a.last_name}` }] }],
        from: { email: FROM, name: "Nuway Careers" },
        subject: job ? `We've received your application — ${job.title}` : "We've received your details — Nuway Careers",
        content: [{
          type: "text/html",
          value: `<div style="font-family:Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#191919;font-size:16px;line-height:1.5">
<div style="background:#1B9AAA;padding:20px 24px;color:#fff;font-size:22px;font-weight:700">Thanks, ${esc(a.first_name)}</div>
<div style="padding:24px;border:1px solid #e3e8ea;border-top:0">
<p>We've received your ${job ? `application for <strong>${esc(job.title)}</strong>` : "details"}${loc ? ` at our ${esc(loc.name)} store` : ""}.</p>
<p>The store team reads every application. If you're a good fit for a role, they'll be in touch by phone or email.</p>
<p style="margin-bottom:0">Nuway Landscape Supplies<br><a href="https://nuway.com.au" style="color:#1B9AAA">nuway.com.au</a></p>
</div></div>`,
        }],
      });
    }

    await admin.from("careers_email_log").insert({ ...logRow, ok: true });
    return new Response(JSON.stringify({ ok: true, recipients: to }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    if (logRow) await admin.from("careers_email_log").insert({ ...logRow, ok: false, detail: String(err).slice(0, 500) });
    return new Response(String(err).slice(0, 500), { status: 500, headers: cors });
  }
});
