// =====================================================================
// Nuway Careers — admin panel
// Routes: #jobs | #applicants | #applicants/<id> | #stores
// =====================================================================
(function () {
  const C = window.Careers, cfg = window.NUWAY_CAREERS, esc = C.esc;
  const $ = (s, r = document) => r.querySelector(s);
  let locations = [], jobs = [], apps = [];

  if (C.DEMO) $("#demo").classList.remove("hidden");

  // ---------------- auth ----------------
  async function boot() {
    const session = await C.session();
    if (!session) return showLogin();
    let ok = false;
    try { ok = await C.isAdmin(); } catch (e) { console.error(e); }
    if (!ok) { showLogin(`Signed in as ${esc(session.user.email)}, but that email isn't on the admin list.`); await C.signOut(); return; }
    $("#who").textContent = session.user.email;
    $("#login").classList.add("hidden");
    $("#shell").classList.remove("hidden");
    await load();
    route();
    window.addEventListener("hashchange", route);
  }

  function showLogin(msg) {
    $("#login").classList.remove("hidden");
    $("#shell").classList.add("hidden");
    if (msg) $("#login-alert").innerHTML = `<div class="alert bad">${msg}</div>`;
  }
  $("#l-go").addEventListener("click", async () => {
    const btn = $("#l-go"); btn.disabled = true;
    try { await C.signIn($("#l-email").value.trim(), $("#l-pass").value); location.reload(); }
    catch (e) { $("#login-alert").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; btn.disabled = false; }
  });
  $("#l-pass").addEventListener("keydown", e => { if (e.key === "Enter") $("#l-go").click(); });
  $("#l-magic").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = $("#l-email").value.trim();
    if (!email) return $("#l-email").focus();
    try { await C.magicLink(email); $("#login-alert").innerHTML = `<div class="alert good">Check your inbox for a sign-in link.</div>`; }
    catch (err) { $("#login-alert").innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; }
  });
  $("#signout").addEventListener("click", async (e) => { e.preventDefault(); await C.signOut(); location.reload(); });

  async function load() {
    [locations, jobs, apps] = await Promise.all([C.allLocations(), C.allJobs(), C.applications()]);
    $("#n-jobs").textContent = jobs.filter(j => j.status === "live").length || "";
    $("#n-new").textContent = apps.filter(a => a.status === "new").length || "";
  }

  // ---------------- routing ----------------
  function route() {
    const h = location.hash || "#jobs";
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("active", h.startsWith("#" + a.dataset.nav)));
    const m = h.match(/^#applicants\/(.+)$/);
    if (m) { renderApplicants(); openApplicant(m[1]); return; }
    if (h.startsWith("#applicants")) return renderApplicants();
    if (h.startsWith("#stores")) return renderStores();
    renderJobs();
  }

  const statusPill = (s) => `<span class="status ${esc(s)}">${esc(s)}</span>`;
  const locName = (j) => j.all_locations ? "All stores" : (j.location_name || "—");

  // ================= JOBS =================
  function renderJobs() {
    const live = jobs.filter(j => j.status === "live").length;
    $("#content").innerHTML = `
      <div class="bar">
        <h2>Jobs</h2>
        <div class="tools">
          <select id="j-status"><option value="">All statuses</option>${["live","draft","paused","closed"].map(s => `<option>${s}</option>`).join("")}</select>
          <button class="btn" id="new-job">+ New job</button>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><b>${live}</b><span>Live on the careers page</span></div>
        <div class="stat"><b>${jobs.filter(j => j.on_seek && j.status === "live").length}</b><span>Also on SEEK</span></div>
        <div class="stat"><b>${apps.filter(a => a.status === "new").length}</b><span>New applicants to review</span></div>
        <div class="stat"><b>${apps.filter(a => !a.job_id).length}</b><span>In the talent pool</span></div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Role</th><th>Store</th><th>Type</th><th>Status</th><th>SEEK</th><th>Applicants</th><th>Posted</th></tr></thead>
        <tbody id="j-body"></tbody>
      </table></div>`;
    const draw = () => {
      const f = $("#j-status").value;
      const list = jobs.filter(j => !f || j.status === f);
      $("#j-body").innerHTML = list.length ? list.map(j => `<tr class="row" data-id="${j.id}">
        <td><div class="t">${esc(j.title)}</div><div class="sub">${j.role_types.map(esc).join(", ")}</div></td>
        <td>${esc(locName(j))}</td>
        <td>${esc(j.employment_type)}</td>
        <td>${statusPill(j.status)}</td>
        <td>${j.on_seek ? `<a href="${esc(j.seek_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">View ↗</a>` : '<span class="muted">—</span>'}</td>
        <td>${j.total_applications || 0}${j.new_applications ? ` <span class="status new">${j.new_applications} new</span>` : ""}</td>
        <td class="sub">${C.fmtDate(j.published_at || j.created_at)}${j.closes_on ? `<br>closes ${C.fmtDate(j.closes_on)}` : ""}</td>
      </tr>`).join("") : `<tr><td colspan="7" class="muted">No jobs yet. Click "New job" to add one.</td></tr>`;
      $("#j-body").querySelectorAll("tr.row").forEach(tr => tr.addEventListener("click", () => editJob(jobs.find(j => j.id === tr.dataset.id))));
    };
    draw();
    $("#j-status").addEventListener("change", draw);
    $("#new-job").addEventListener("click", () => editJob(null));
  }

  function editJob(job) {
    const j = job || { title: "", location_id: "", all_locations: false, role_types: [], employment_type: "Full-time", summary: "", description: "", requirements: "", pay_text: "", status: "draft", on_seek: false, seek_url: "", accept_direct: true, closes_on: null };
    openModal(`
      <h2>${job ? "Edit job" : "New job"}</h2>
      <div id="m-alert"></div>
      <div class="field"><label>Job title</label><input type="text" id="e-title" value="${esc(j.title)}" placeholder="e.g. HR Truck Driver — Logan"><div class="help">Put the store in the title — it's what people scan for.</div></div>
      <div class="two">
        <div class="field"><label>Store</label>
          <select id="e-loc"><option value="">— choose —</option>${locations.map(l => `<option value="${l.id}" ${l.id === j.location_id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select>
          <label class="small" style="display:flex;gap:8px;align-items:center;margin-top:8px;font-weight:400"><input type="checkbox" id="e-all" ${j.all_locations ? "checked" : ""}> Open at all stores (applicant picks one)</label>
        </div>
        <div class="field"><label>Employment type</label><select id="e-type">${cfg.EMPLOYMENT_TYPES.map(t => `<option ${t === j.employment_type ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label>Role type(s) — tick all that apply</label><div class="checks">${cfg.ROLE_TYPES.map(r => `<label><input type="checkbox" name="e-role" value="${r}" ${j.role_types.includes(r) ? "checked" : ""}> ${r}</label>`).join("")}</div></div>
      <div class="field"><label>One-line summary <span class="opt">(shows on the card)</span></label><input type="text" id="e-summary" value="${esc(j.summary)}" maxlength="160"></div>
      <div class="field"><label>Description</label><textarea id="e-desc" style="min-height:160px">${esc(j.description)}</textarea><div class="help">Plain text. Blank line between paragraphs, "- " for bullets, **bold** for emphasis.</div></div>
      <div class="field"><label>What they'll need <span class="opt">(one per line, starting with "- ")</span></label><textarea id="e-req">${esc(j.requirements || "")}</textarea></div>
      <div class="two">
        <div class="field"><label>Pay <span class="opt">(optional, shown publicly)</span></label><input type="text" id="e-pay" value="${esc(j.pay_text || "")}" placeholder="e.g. Above award + super"></div>
        <div class="field"><label>Closing date <span class="opt">(optional)</span></label><input type="date" id="e-close" value="${j.closes_on || ""}"></div>
      </div>

      <div class="seek-row">
        <label class="small" style="display:flex;gap:8px;align-items:center;font-weight:700;color:var(--slate)"><input type="checkbox" id="e-seek" ${j.on_seek ? "checked" : ""}> This role is also advertised on SEEK</label>
        <div id="e-seek-wrap" style="margin-top:10px;${j.on_seek ? "" : "display:none"}">
          <div class="field" style="margin:0"><label>SEEK job link</label><input type="text" id="e-seek-url" value="${esc(j.seek_url || "")}" placeholder="https://www.seek.com.au/job/12345678"></div>
          <label class="small" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="e-direct" ${j.accept_direct ? "checked" : ""}> Also accept applications through our own form</label>
        </div>
      </div>

      <div class="field"><label>Status</label><select id="e-status">${["draft","live","paused","closed"].map(s => `<option ${s === j.status ? "selected" : ""}>${s}</option>`).join("")}</select><div class="help">Only <b>live</b> jobs show on the careers page. Paused hides it without losing anything.</div></div>

      <div class="modal-foot">
        ${job ? `<button class="btn danger" id="m-del">Delete</button>` : "<span></span>"}
        <div class="right"><button class="btn ghost" id="m-cancel">Cancel</button><button class="btn" id="m-save">${job ? "Save changes" : "Create job"}</button></div>
      </div>`);

    $("#e-seek").addEventListener("change", e => { $("#e-seek-wrap").style.display = e.target.checked ? "" : "none"; });
    $("#e-all").addEventListener("change", e => { $("#e-loc").disabled = e.target.checked; });
    $("#e-loc").disabled = j.all_locations;
    $("#m-cancel").addEventListener("click", closeModal);
    if (job) $("#m-del").addEventListener("click", async () => {
      if (!confirm(`Delete "${job.title}"? Applications stay on file.`)) return;
      await C.deleteJob(job.id); closeModal(); await load(); renderJobs();
    });
    $("#m-save").addEventListener("click", async () => {
      const roles = [...document.querySelectorAll("[name=e-role]:checked")].map(x => x.value);
      const all = $("#e-all").checked;
      const onSeek = $("#e-seek").checked;
      const out = {
        title: $("#e-title").value.trim(),
        location_id: all ? null : ($("#e-loc").value || null),
        all_locations: all,
        role_types: roles,
        employment_type: $("#e-type").value,
        summary: $("#e-summary").value.trim(),
        description: $("#e-desc").value.trim(),
        requirements: $("#e-req").value.trim() || null,
        pay_text: $("#e-pay").value.trim() || null,
        closes_on: $("#e-close").value || null,
        on_seek: onSeek,
        seek_url: onSeek ? $("#e-seek-url").value.trim() : null,
        accept_direct: onSeek ? $("#e-direct").checked : true,
        status: $("#e-status").value,
      };
      const problems = [];
      if (!out.title) problems.push("a title");
      if (!all && !out.location_id) problems.push("a store (or tick all stores)");
      if (!roles.length) problems.push("at least one role type");
      if (!out.summary) problems.push("a one-line summary");
      if (!out.description) problems.push("a description");
      if (onSeek && !/^https?:\/\/(www\.)?seek\.com\.au\//i.test(out.seek_url)) problems.push("a valid seek.com.au link");
      if (onSeek && !out.accept_direct && !out.seek_url) problems.push("somewhere to apply");
      if (problems.length) { $("#m-alert").innerHTML = `<div class="alert bad">Needs ${problems.join(", ")}.</div>`; $("#modal-box").scrollTop = 0; return; }
      if (job) out.id = job.id;
      else { out.slug = C.slugify(out.title) + "-" + Math.random().toString(36).slice(2, 6); out.created_by = $("#who").textContent; }
      const btn = $("#m-save"); btn.disabled = true;
      try { await C.saveJob(out); closeModal(); await load(); renderJobs(); }
      catch (e) { $("#m-alert").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; btn.disabled = false; }
    });
  }

  // ================= APPLICANTS =================
  function renderApplicants() {
    $("#content").innerHTML = `
      <div class="bar">
        <h2>Applicants</h2>
        <div class="tools">
          <select id="a-job"><option value="">All roles</option><option value="pool">Talent pool (no specific role)</option>${jobs.map(j => `<option value="${j.id}">${esc(j.title)}</option>`).join("")}</select>
          <select id="a-loc"><option value="">All stores</option>${locations.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select>
          <select id="a-status"><option value="">Any status</option>${["new","reviewed","interviewing","offered","hired","declined"].map(s => `<option>${s}</option>`).join("")}</select>
          <input type="search" id="a-q" placeholder="Search name, email, suburb">
          <button class="btn ghost sm" id="a-csv">Export CSV</button>
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Role</th><th>Store</th><th>Licence</th><th>Rights</th><th>CV</th><th>Status</th><th>Received</th></tr></thead>
        <tbody id="a-body"></tbody>
      </table></div>`;
    const draw = () => {
      const list = filteredApps();
      $("#a-body").innerHTML = list.length ? list.map(a => `<tr class="row" data-id="${a.id}">
        <td><div class="t">${esc(a.first_name)} ${esc(a.last_name)}</div><div class="sub">${esc(a.email)} · ${esc(a.phone)}</div></td>
        <td>${a.job_title ? esc(a.job_title) : `<span class="muted">Talent pool</span><div class="sub">${(a.role_types || []).map(esc).join(", ")}</div>`}</td>
        <td>${esc(a.location_name || "—")}</td>
        <td>${esc(a.licence_class || "—")}${a.forklift ? '<div class="sub">Forklift</div>' : ""}</td>
        <td class="sub">${esc(a.working_rights)}</td>
        <td>${a.cv_path ? "✓" : '<span class="muted">—</span>'}</td>
        <td>${statusPill(a.status)}</td>
        <td class="sub">${C.fmtDate(a.created_at)}</td>
      </tr>`).join("") : `<tr><td colspan="8" class="muted">No applicants match.</td></tr>`;
      $("#a-body").querySelectorAll("tr.row").forEach(tr => tr.addEventListener("click", () => { location.hash = "#applicants/" + tr.dataset.id; }));
    };
    const filteredApps = () => {
      const jf = $("#a-job").value, lf = $("#a-loc").value, sf = $("#a-status").value, q = $("#a-q").value.trim().toLowerCase();
      return apps.filter(a =>
        (!jf || (jf === "pool" ? !a.job_id : a.job_id === jf)) &&
        (!lf || a.location_id === lf) &&
        (!sf || a.status === sf) &&
        (!q || [a.first_name, a.last_name, a.email, a.suburb, a.phone].join(" ").toLowerCase().includes(q)));
    };
    draw();
    ["a-job","a-loc","a-status"].forEach(id => $("#" + id).addEventListener("change", draw));
    $("#a-q").addEventListener("input", draw);
    $("#a-csv").addEventListener("click", () => {
      const cols = ["created_at","status","first_name","last_name","email","phone","suburb","job_title","location_name","role_types","employment_types","weekends","start_date","licence_class","licence_auto_only","forklift","loader","white_card","working_rights","visa_details","message","cv_filename"];
      const csv = [cols.join(",")].concat(filteredApps().map(a => cols.map(c => { let v = a[c]; if (Array.isArray(v)) v = v.join("; "); v = v == null ? "" : String(v); return '"' + v.replace(/"/g, '""') + '"'; }).join(","))).join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv" });
      const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = `nuway-applicants-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(u);
    });
  }

  async function openApplicant(id) {
    const a = apps.find(x => x.id === id);
    if (!a) return;
    const yn = (v) => v === true ? "Yes" : v === false ? "No" : "—";
    openModal(`
      <div class="app-detail">
        <div class="bar" style="margin-bottom:12px">
          <div><h2 style="margin:0">${esc(a.first_name)} ${esc(a.last_name)}</h2><div class="muted">${a.job_title ? esc(a.job_title) : "Talent pool"}${a.location_name ? " · " + esc(a.location_name) : ""} · received ${C.fmtDate(a.created_at)}</div></div>
          <select id="ap-status">${["new","reviewed","interviewing","offered","hired","declined"].map(s => `<option ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div>
        <div id="m-alert"></div>
        <dl>
          <dt>Email</dt><dd><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></dd>
          <dt>Phone</dt><dd><a href="tel:${esc(a.phone)}">${esc(a.phone)}</a></dd>
          <dt>Suburb</dt><dd>${esc(a.suburb || "—")}</dd>
          <dt>Interested in</dt><dd>${(a.role_types || []).map(esc).join(", ") || "—"}</dd>
          <dt>Availability</dt><dd>${(a.employment_types || []).map(esc).join(", ") || "—"} · Weekends: ${yn(a.weekends)} · Start: ${esc(a.start_date || "—")}</dd>
          <dt>Licence</dt><dd>${esc(a.licence_class || "—")}${a.licence_auto_only ? " (auto only)" : ""} · Forklift: ${yn(a.forklift)} · Loader: ${yn(a.loader)} · White card: ${yn(a.white_card)}</dd>
          <dt>Working rights</dt><dd>${esc(a.working_rights)}${a.visa_details ? " — " + esc(a.visa_details) : ""}</dd>
        </dl>
        ${a.message ? `<div class="msg">${esc(a.message)}</div>` : ""}
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
          ${a.cv_path ? `<button class="btn sm" id="ap-cv">Open CV (${esc(a.cv_filename || "file")})</button>` : '<span class="muted small">No CV attached</span>'}
          <a class="btn ghost sm" href="mailto:${esc(a.email)}?subject=${encodeURIComponent("Your application to Nuway" + (a.job_title ? " — " + a.job_title : ""))}">Email applicant</a>
        </div>
        <div id="cv-preview"></div>
        <div class="field" style="margin-top:18px"><label>Internal notes</label><textarea id="ap-notes" style="min-height:80px">${esc(a.admin_notes || "")}</textarea></div>
        <div class="modal-foot"><span></span><div class="right"><button class="btn ghost" id="m-cancel">Close</button><button class="btn" id="m-save">Save</button></div></div>
      </div>`);
    $("#m-cancel").addEventListener("click", () => { closeModal(); location.hash = "#applicants"; });
    $("#m-save").addEventListener("click", async () => {
      try {
        await C.updateApplication(a.id, { status: $("#ap-status").value, admin_notes: $("#ap-notes").value.trim() || null });
        closeModal(); await load(); location.hash = "#applicants"; renderApplicants();
      } catch (e) { $("#m-alert").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; }
    });
    if (a.cv_path) $("#ap-cv").addEventListener("click", async () => {
      try {
        const url = await C.cvUrl(a.cv_path);
        if (C.DEMO) { $("#cv-preview").innerHTML = `<div class="help">Demo mode — CV wasn't really uploaded.</div>`; return; }
        window.open(url, "_blank");
        if (/\.pdf$/i.test(a.cv_filename || "")) $("#cv-preview").innerHTML = `<div class="preview"><iframe src="${esc(url)}"></iframe></div>`;
      } catch (e) { $("#m-alert").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; }
    });
  }

  // ================= STORES =================
  function renderStores() {
    $("#content").innerHTML = `
      <div class="bar"><h2>Stores</h2><div class="muted small">Click a store to edit its details and where its applications are emailed.</div></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Store</th><th>Address</th><th>Phone</th><th>Applications go to</th><th>Region</th><th>Shown</th></tr></thead>
        <tbody>${locations.map(l => `<tr class="row" data-id="${l.id}">
          <td class="t">${esc(l.name)}</td><td class="sub">${esc(l.address)}, ${esc(l.suburb)} ${esc(l.postcode)}</td><td>${esc(l.phone || "—")}</td>
          <td>${esc(l.hiring_email || l.store_email || "—")}${!l.hiring_email && l.store_email ? '<div class="sub">store email</div>' : ""}</td>
          <td>${esc(l.region || "—")}</td><td>${l.active ? "✓" : '<span class="muted">hidden</span>'}</td></tr>`).join("")}</tbody>
      </table></div>`;
    document.querySelectorAll("tr.row").forEach(tr => tr.addEventListener("click", () => editStore(locations.find(l => l.id === tr.dataset.id))));
  }

  function editStore(l) {
    openModal(`
      <h2>${esc(l.name)}</h2><div id="m-alert"></div>
      <div class="two">
        <div class="field"><label>Store name</label><input type="text" id="s-name" value="${esc(l.name)}"></div>
        <div class="field"><label>Region</label><input type="text" id="s-region" value="${esc(l.region || "")}"></div>
        <div class="field"><label>Street address</label><input type="text" id="s-addr" value="${esc(l.address)}"></div>
        <div class="field"><label>Suburb</label><input type="text" id="s-suburb" value="${esc(l.suburb)}"></div>
        <div class="field"><label>Postcode</label><input type="text" id="s-pc" value="${esc(l.postcode)}"></div>
        <div class="field"><label>Phone</label><input type="text" id="s-phone" value="${esc(l.phone || "")}"></div>
        <div class="field"><label>Store email (public)</label><input type="email" id="s-email" value="${esc(l.store_email || "")}"></div>
        <div class="field"><label>Send applications to <span class="opt">(blank = store email)</span></label><input type="email" id="s-hire" value="${esc(l.hiring_email || "")}"></div>
      </div>
      <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="s-active" ${l.active ? "checked" : ""}> Show this store on the careers page</label>
      <div class="modal-foot"><span></span><div class="right"><button class="btn ghost" id="m-cancel">Cancel</button><button class="btn" id="m-save">Save</button></div></div>`);
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-save").addEventListener("click", async () => {
      try {
        await C.saveLocation({ id: l.id, name: $("#s-name").value.trim(), region: $("#s-region").value.trim() || null, address: $("#s-addr").value.trim(), suburb: $("#s-suburb").value.trim(), postcode: $("#s-pc").value.trim(), phone: $("#s-phone").value.trim() || null, store_email: $("#s-email").value.trim() || null, hiring_email: $("#s-hire").value.trim() || null, active: $("#s-active").checked });
        closeModal(); await load(); renderStores();
      } catch (e) { $("#m-alert").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; }
    });
  }

  // ---------------- modal ----------------
  function openModal(html) { $("#modal-box").innerHTML = html; $("#modal").classList.remove("hidden"); document.body.style.overflow = "hidden"; }
  function closeModal() { $("#modal").classList.add("hidden"); document.body.style.overflow = ""; }
  $("#modal").addEventListener("click", e => { if (e.target === e.currentTarget) { closeModal(); if (location.hash.startsWith("#applicants/")) location.hash = "#applicants"; } });

  boot();
})();
