// =====================================================================
// Nuway Careers — public page logic
// Hash routing:  #jobs  |  #job/<slug>  |  #interest
// =====================================================================
(function () {
  const C = window.Careers, cfg = window.NUWAY_CAREERS, esc = C.esc;
  const $ = (s, r = document) => r.querySelector(s);
  let locations = [], jobs = [];
  const state = { loc: "", type: "", q: "", roles: new Set() };

  if (C.DEMO) $("#demo").classList.remove("hidden");
  if (new URLSearchParams(location.search).get("embed") === "1") document.body.classList.add("embedded");

  const pin = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  // ---------------- boot ----------------
  async function boot() {
    try {
      [locations, jobs] = await Promise.all([C.locations(), C.liveJobs()]);
    } catch (e) {
      $("#job-grid").innerHTML = `<div class="empty"><strong>Couldn't load roles</strong>${esc(e.message || e)}</div>`;
      return;
    }
    buildFilters();
    renderStores();
    renderInterestForm();
    route();
    window.addEventListener("hashchange", route);
  }

  // ---------------- filters ----------------
  function buildFilters() {
    const sel = $("#f-loc");
    for (const l of locations) sel.insertAdjacentHTML("beforeend", `<option value="${l.id}">${esc(l.name)} — ${esc(l.suburb)}</option>`);
    sel.addEventListener("change", () => { state.loc = sel.value; renderJobs(); });
    const t = $("#f-type");
    for (const x of cfg.EMPLOYMENT_TYPES) t.insertAdjacentHTML("beforeend", `<option>${esc(x)}</option>`);
    t.addEventListener("change", () => { state.type = t.value; renderJobs(); });
    $("#f-q").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); renderJobs(); });
    const chips = $("#f-roles");
    for (const r of cfg.ROLE_TYPES) {
      const b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = r; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        state.roles.has(r) ? state.roles.delete(r) : state.roles.add(r);
        b.setAttribute("aria-pressed", state.roles.has(r));
        renderJobs();
      });
      chips.appendChild(b);
    }
  }

  function filtered() {
    return jobs.filter(j => {
      if (state.loc && !j.all_locations && j.location_id !== state.loc) return false;
      if (state.type && j.employment_type !== state.type) return false;
      if (state.roles.size && !j.role_types.some(r => state.roles.has(r))) return false;
      if (state.q) {
        const hay = [j.title, j.summary, j.description, j.requirements, j.location_name, j.location_suburb, j.role_types.join(" ")].join(" ").toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      return true;
    });
  }

  // ---------------- job cards ----------------
  function renderJobs() {
    const list = filtered();
    $("#count").textContent = list.length === jobs.length
      ? `${jobs.length} open role${jobs.length === 1 ? "" : "s"}`
      : `${list.length} of ${jobs.length} roles match`;
    const grid = $("#job-grid");
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><strong>No roles match right now</strong>Try another store, or <a href="#interest">register your interest</a> and we'll keep you on file.</div>`;
      return;
    }
    grid.innerHTML = list.map(card).join("");
  }

  function card(j) {
    const where = j.all_locations ? "All stores" : (j.location_name === j.location_suburb ? esc(j.location_name) : `${esc(j.location_name)} · ${esc(j.location_suburb)}`);
    return `<article class="card">
      <div class="tags">${j.role_types.map(r => `<span class="tag">${esc(r)}</span>`).join("")}<span class="tag type">${esc(j.employment_type)}</span>${j.on_seek ? '<span class="tag seek">On SEEK</span>' : ""}</div>
      <h3><a href="#job/${esc(j.slug)}">${esc(j.title)}</a></h3>
      <div class="loc">${pin}${where}</div>
      <p>${esc(j.summary)}</p>
      <div class="foot">
        <span class="small muted">Posted ${C.fmtDate(j.published_at)}${j.closes_on ? ` · Closes ${C.fmtDate(j.closes_on)}` : ""}</span>
        <a class="btn sm" href="#job/${esc(j.slug)}">View &amp; apply</a>
      </div>
    </article>`;
  }

  // ---------------- stores ----------------
  function renderStores() {
    $("#store-grid").innerHTML = locations.map(l => `<div class="store">
      <b>${esc(l.name)}</b>${esc(l.address)}, ${esc(l.suburb)} ${esc(l.postcode)}<br>
      ${l.phone ? `<a href="tel:${esc(l.phone.replace(/\s/g, ""))}">${esc(l.phone)}</a>` : ""}
    </div>`).join("");
  }

  // ---------------- routing ----------------
  function route() {
    const h = location.hash || "#jobs";
    const m = h.match(/^#job\/([\w-]+)/);
    if (m) {
      const j = jobs.find(x => x.slug === m[1]);
      if (j) { showDetail(j); return; }
    }
    $("#view-detail").classList.add("hidden");
    $("#view-list").classList.remove("hidden");
    renderJobs();
    if (h === "#jobs" || h === "#interest") { const t = $(h); if (t) t.scrollIntoView({ block: "start" }); }
  }

  // ---------------- detail ----------------
  function showDetail(j) {
    $("#view-list").classList.add("hidden");
    $("#view-detail").classList.remove("hidden");
    window.scrollTo(0, 0);
    document.title = `${j.title} — Careers at Nuway`;
    const loc = locations.find(l => l.id === j.location_id);
    const where = j.all_locations ? "All stores" : (j.location_name === j.location_suburb ? j.location_name : `${j.location_name}, ${j.location_suburb}`);

    let apply = "";
    if (j.on_seek && j.seek_url) apply += `<a class="btn" href="${esc(j.seek_url)}" target="_blank" rel="noopener">Apply on SEEK ↗</a>`;
    if (j.accept_direct) {
      if (apply) apply += `<div class="or">or</div>`;
      apply += `<a class="btn ${j.on_seek ? "ghost" : ""}" href="#apply-form" id="apply-jump">Apply directly</a>`;
    }

    $("#detail-host").innerHTML = `
      <a class="back" href="#jobs">← All roles</a>
      <div class="top">
        <div>
          <div class="tags">${j.role_types.map(r => `<span class="tag">${esc(r)}</span>`).join("")}<span class="tag type">${esc(j.employment_type)}</span>${j.on_seek ? '<span class="tag seek">On SEEK</span>' : ""}</div>
          <h1 style="font-size:clamp(26px,4vw,38px);margin-top:10px">${esc(j.title)}</h1>
          <div class="meta">
            <span>${pin} <b>${esc(where)}</b></span>
            <span>Posted <b>${C.fmtDate(j.published_at)}</b></span>
            ${j.closes_on ? `<span>Closes <b>${C.fmtDate(j.closes_on)}</b></span>` : ""}
            ${j.pay_text ? `<span>Pay <b>${esc(j.pay_text)}</b></span>` : ""}
          </div>
        </div>
      </div>
      <div class="cols">
        <div>
          <div class="prose">
            <p style="font-size:18px;color:var(--slate);font-weight:500">${esc(j.summary)}</p>
            ${C.md(j.description)}
            ${j.requirements ? `<h4>What you'll need</h4>${C.md(j.requirements)}` : ""}
          </div>
          ${j.accept_direct ? `<div id="apply-form" class="form" style="margin-top:34px"></div>` : ""}
        </div>
        <aside class="side">
          <div class="panel">
            <h3>Interested?</h3>
            ${apply || '<p class="muted small">Applications for this role are closed.</p>'}
            ${loc ? `<div class="store-box"><b>${esc(loc.name)} store</b>${esc(loc.address)}, ${esc(loc.suburb)} ${esc(loc.postcode)}<br>${loc.phone ? `<a href="tel:${esc(loc.phone.replace(/\s/g,""))}">${esc(loc.phone)}</a>` : ""}</div>` : ""}
          </div>
        </aside>
      </div>`;

    if (j.accept_direct) renderForm($("#apply-form"), { job: j });
  }

  // ---------------- forms ----------------
  function renderInterestForm() { renderForm($("#interest-form-host"), { job: null }); }

  function opts(arr, sel) { return arr.map(x => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join(""); }
  function checks(name, arr) { return arr.map(x => `<label><input type="checkbox" name="${name}" value="${esc(x)}"> ${esc(x)}</label>`).join(""); }

  function renderForm(host, { job }) {
    const isInterest = !job;
    const needLoc = isInterest || job.all_locations;
    const showRoles = isInterest;
    host.innerHTML = `
      <h3>${isInterest ? "Register your interest" : `Apply for ${esc(job.title)}`}</h3>
      <p class="lead">${isInterest ? "Takes about two minutes. Attach a CV if you have one." : "Takes about two minutes. Your CV goes straight to the store manager."}</p>
      <form novalidate>
        <div id="f-alert"></div>
        <fieldset>
          <legend>About you</legend>
          <div class="two">
            <div class="field"><label>First name</label><input type="text" name="first_name" required autocomplete="given-name"></div>
            <div class="field"><label>Last name</label><input type="text" name="last_name" required autocomplete="family-name"></div>
            <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
            <div class="field"><label>Mobile</label><input type="tel" name="phone" required autocomplete="tel"></div>
            <div class="field"><label>Suburb <span class="opt">(optional)</span></label><input type="text" name="suburb" autocomplete="address-level2"></div>
            ${needLoc ? `<div class="field"><label>Preferred store</label><select name="location_id" required><option value="">Choose a store…</option>${locations.map(l => `<option value="${l.id}">${esc(l.name)} — ${esc(l.suburb)}</option>`).join("")}</select></div>` : ""}
          </div>
          ${showRoles ? `<div class="field"><label>What kind of work?</label><div class="checks">${checks("role_types", cfg.ROLE_TYPES)}</div></div>` : ""}
        </fieldset>

        <fieldset>
          <legend>Availability</legend>
          <div class="field"><label>I'm looking for</label><div class="checks">${checks("employment_types", cfg.EMPLOYMENT_TYPES)}</div></div>
          <div class="two">
            <div class="field"><label>Weekends?</label><select name="weekends"><option value="">—</option><option value="true">Yes, I can work weekends</option><option value="false">Weekdays only</option></select></div>
            <div class="field"><label>When can you start?</label><input type="text" name="start_date" placeholder="e.g. Immediately, 2 weeks' notice"></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Licences &amp; tickets</legend>
          <div class="two">
            <div class="field"><label>Driver licence</label><select name="licence_class">${opts(cfg.LICENCE_CLASSES)}</select></div>
            <div class="field"><label>Transmission</label><select name="licence_auto_only"><option value="">—</option><option value="false">Manual &amp; auto</option><option value="true">Auto only</option></select></div>
          </div>
          <div class="field"><div class="checks">
            <label><input type="checkbox" name="forklift"> Forklift ticket (LF)</label>
            <label><input type="checkbox" name="loader"> Front end loader (LL)</label>
            <label><input type="checkbox" name="white_card"> White card</label>
          </div></div>
        </fieldset>

        <fieldset>
          <legend>Working rights</legend>
          <div class="two">
            <div class="field"><label>Right to work in Australia</label><select name="working_rights" required><option value="">Choose…</option>${opts(cfg.WORKING_RIGHTS)}</select></div>
            <div class="field" id="visa-wrap" style="display:none"><label>Visa type &amp; conditions</label><input type="text" name="visa_details" placeholder="e.g. 482, no restrictions"></div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Your CV ${isInterest ? '<span class="opt" style="font-weight:400;color:var(--grey)">(optional)</span>' : ""}</legend>
          <label class="upload" id="upload">
            <input type="file" name="cv" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/heic,image/heif">
            <strong>Click to choose a file, or drag it here</strong>
            <span class="hint">PDF, Word or a photo of it — up to 10 MB</span>
          </label>
          <div class="err" id="cv-err"></div>
        </fieldset>

        <fieldset>
          <legend>Anything else? <span class="opt" style="font-weight:400;color:var(--grey)">(optional)</span></legend>
          <div class="field"><textarea name="message" placeholder="Experience, why this store, or anything you'd like us to know."></textarea></div>
        </fieldset>

        <label class="consent"><input type="checkbox" name="consent" required><span>I agree to Nuway storing my details and CV for recruitment purposes, and contacting me about this and other suitable roles. See our <a href="https://nuway.com.au/privacy-policy/" target="_blank" rel="noopener">privacy policy</a>.</span></label>

        <button class="btn" type="submit">${isInterest ? "Register interest" : "Send application"}</button>
      </form>`;

    const form = $("form", host);
    const wr = form.working_rights, visa = $("#visa-wrap", host);
    wr.addEventListener("change", () => { visa.style.display = /visa|other/i.test(wr.value) ? "" : "none"; });

    // file picker feedback + drag/drop
    const up = $("#upload", host), fileIn = form.cv, hint = $(".hint", up), cvErr = $("#cv-err", host);
    const showFile = () => {
      const f = fileIn.files[0]; cvErr.textContent = "";
      if (!f) { hint.textContent = "PDF, Word or a photo of it — up to 10 MB"; hint.className = "hint"; return; }
      if (f.size > 10 * 1024 * 1024) { cvErr.textContent = "That file is over 10 MB. Try a smaller PDF, or a single photo rather than a scan."; fileIn.value = ""; return; }
      hint.textContent = `✓ ${f.name} (${(f.size / 1024).toFixed(0)} KB)`; hint.className = "hint file";
    };
    fileIn.addEventListener("change", showFile);
    ["dragenter", "dragover"].forEach(ev => up.addEventListener(ev, e => { e.preventDefault(); up.classList.add("drag"); }));
    ["dragleave", "drop"].forEach(ev => up.addEventListener(ev, e => { e.preventDefault(); up.classList.remove("drag"); }));
    up.addEventListener("drop", e => { if (e.dataTransfer.files[0]) { fileIn.files = e.dataTransfer.files; showFile(); } });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alert = $("#f-alert", host);
      alert.innerHTML = "";
      // validation
      const missing = [...form.querySelectorAll("[required]")].filter(el => el.type === "checkbox" ? !el.checked : !el.value.trim());
      if (missing.length) { alert.innerHTML = `<div class="alert bad">Please fill in the highlighted fields.</div>`; missing[0].focus(); missing.forEach(el => el.style.borderColor = "var(--danger)"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value)) { alert.innerHTML = `<div class="alert bad">That email address doesn't look right.</div>`; form.email.focus(); return; }
      if (!isInterest && !fileIn.files[0]) { alert.innerHTML = `<div class="alert bad">Please attach your CV.</div>`; up.scrollIntoView({ block: "center" }); return; }

      const btn = $("button[type=submit]", form); btn.disabled = true; btn.textContent = "Sending…";
      try {
        let cv = { path: null, filename: null };
        if (fileIn.files[0]) cv = await C.uploadCv(fileIn.files[0]);
        const many = (n) => [...form.querySelectorAll(`[name=${n}]:checked`)].map(x => x.value);
        const tri = (v) => v === "" ? null : v === "true";
        const row = {
          job_id: job ? job.id : null,
          location_id: needLoc ? form.location_id.value : job.location_id,
          role_types: showRoles ? many("role_types") : job.role_types,
          first_name: form.first_name.value.trim(), last_name: form.last_name.value.trim(),
          email: form.email.value.trim(), phone: form.phone.value.trim(), suburb: form.suburb.value.trim() || null,
          employment_types: many("employment_types"), weekends: tri(form.weekends.value), start_date: form.start_date.value.trim() || null,
          licence_class: form.licence_class.value, licence_auto_only: tri(form.licence_auto_only.value),
          forklift: form.forklift.checked, loader: form.loader.checked, white_card: form.white_card.checked,
          working_rights: form.working_rights.value, visa_details: form.visa_details.value.trim() || null,
          message: form.message.value.trim() || null,
          cv_path: cv.path, cv_filename: cv.filename,
          consent: true, source: isInterest ? "website-interest" : "website",
        };
        await C.submitApplication(row);
        host.innerHTML = `<div class="done">
          <div class="tick"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></div>
          <h3>Thanks, ${esc(row.first_name)}. ${isInterest ? "You're on the list." : "Your application is in."}</h3>
          <p class="muted">${isInterest ? "We'll be in touch when a suitable role opens up at " : "The team at "}${esc((locations.find(l => l.id === row.location_id) || {}).name || "your chosen store")}${isInterest ? "." : " will read it and get back to you if you're a good fit."}</p>
          <p><a class="btn ghost" href="#jobs">Back to open roles</a></p>
        </div>`;
        host.scrollIntoView({ block: "center" });
      } catch (err) {
        console.error(err);
        alert.innerHTML = `<div class="alert bad">Sorry, something went wrong sending that. Please try again, or email your CV to ${esc((locations.find(l => l.id === (needLoc ? form.location_id.value : job.location_id)) || {}).store_email || "the store")}.</div>`;
        btn.disabled = false; btn.textContent = isInterest ? "Register interest" : "Send application";
      }
    });
  }

  boot();
})();

// When embedded in an iframe (WordPress shortcode), report our height to the parent
(function () {
  if (window.parent === window) return;
  const send = () => parent.postMessage({ nuwayCareersHeight: document.documentElement.scrollHeight }, "*");
  new ResizeObserver(send).observe(document.body);
  window.addEventListener("hashchange", () => { send(); parent.postMessage({ nuwayCareersScrollTop: true }, "*"); });
  send();
})();
