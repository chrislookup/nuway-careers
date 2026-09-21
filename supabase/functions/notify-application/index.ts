// =====================================================================
// notify-application — Supabase Edge Function
// Fired by a Database Webhook on INSERT into careers_applications.
// Emails the store's hiring address (and a head-office copy) via
// Twilio SendGrid with the CV attached.
//
// Secrets required (Supabase > Edge Functions > Secrets):
//   SENDGRID_API_KEY     — SendGrid key with "Mail Send" permission
//   CAREERS_FROM_EMAIL   — e.g. careers@nuway.com.au (must be a verified sender/domain)
//   CAREERS_CC_EMAIL     — optional head-office copy, e.g. chris@nuway.com.au
//   CAREERS_ADMIN_URL    — e.g. https://nuway.com.au/careers/admin/
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;
const FROM = Deno.env.get("CAREERS_FROM_EMAIL") ?? "careers@nuway.com.au";
const CC = Deno.env.get("CAREERS_CC_EMAIL");
const ADMIN_URL = Deno.env.get("CAREERS_ADMIN_URL") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const row = (label: string, value: unknown) =>
  value === null || value === undefined || value === "" || value === false
    ? ""
    : `<tr><td style="padding:6px 12px 6px 0;color:#263D42;font-weight:600;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:6px 0;color:#191919">${esc(value === true ? "Yes" : value)}</td></tr>`;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const a = payload.record;
    if (!a) return new Response("no record", { status: 400 });

    // Look up job + location
    const [{ data: job }, { data: loc }] = await Promise.all([
      a.job_id
        ? supabase.from("careers_jobs").select("title, slug").eq("id", a.job_id).single()
        : Promise.resolve({ data: null }),
      a.location_id
        ? supabase.from("careers_locations").select("name, hiring_email, store_email").eq("id", a.location_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const to = loc?.hiring_email || loc?.store_email || CC || FROM;
    const subjectWhat = job ? `Application: ${job.title}` : `Register interest: ${(a.role_types ?? []).join(", ") || "any role"}`;
    const subject = `${subjectWhat} — ${a.first_name} ${a.last_name}${loc ? ` (${loc.name})` : ""}`;

    // Fetch CV for attachment
    const attachments: Array<Record<string, string>> = [];
    if (a.cv_path) {
      const { data: file } = await supabase.storage.from("careers-cvs").download(a.cv_path);
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

    const html = `
<div style="font-family:Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;color:#191919">
  <div style="background:#1B9AAA;padding:20px 24px;color:#fff;font-size:22px;font-weight:700">Nuway Careers — new ${job ? "application" : "expression of interest"}</div>
  <div style="padding:24px;border:1px solid #e3e8ea;border-top:0">
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
    </table>
    ${a.message ? `<p style="margin:20px 0 6px;font-weight:600;color:#263D42">Message</p><p style="white-space:pre-wrap;margin:0">${esc(a.message)}</p>` : ""}
    <p style="margin:24px 0 0">${a.cv_path ? "CV attached." : "No CV uploaded."}${ADMIN_URL ? ` <a href="${esc(ADMIN_URL)}#applicants/${esc(a.id)}" style="color:#1B9AAA">Open in admin</a>` : ""}</p>
  </div>
  <p style="font-size:12px;color:#6b7c82;padding:12px 24px">Sent automatically by nuway.com.au/careers. Reply to this email to contact the applicant directly.</p>
</div>`;

    const personalizations: Record<string, unknown> = { to: [{ email: to }] };
    if (CC && CC.toLowerCase() !== to.toLowerCase()) personalizations.cc = [{ email: CC }];

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [personalizations],
        from: { email: FROM, name: "Nuway Careers" },
        reply_to: { email: a.email, name: `${a.first_name} ${a.last_name}` },
        subject,
        content: [{ type: "text/html", value: html }],
        attachments: attachments.length ? attachments : undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("SendGrid error", res.status, text);
      return new Response(`sendgrid ${res.status}`, { status: 502 });
    }

    // Confirmation to the applicant
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    return new Response("ok");
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
