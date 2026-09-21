// =====================================================================
// Nuway Careers — data layer
// Talks to Supabase when configured, otherwise serves demo data so the
// page can be previewed on GitHub Pages before the database is wired up.
// =====================================================================
(function () {
    const cfg = window.NUWAY_CAREERS || {};
    const DEMO = !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY;

   // ---------------- demo data ----------------
   const demoLocations = [
         ["chandler","Chandler","2630 Old Cleveland Road","Chandler","4155","07 3390 2477","chandler@nuway.com.au","Brisbane East"],
         ["redlands","Redlands","249 Cleveland-Redland Bay Road","Thornlands","4164","07 3207 7800","redlands@nuway.com.au","Brisbane East"],
         ["logan","Logan","488 Loganlea Road","Slacks Creek","4127","07 3808 8442","logan@nuway.com.au","Brisbane South"],
         ["forestdale","Forestdale","2-16 Staplyton Road","Forestdale","4118","07 3800 5433","forestdale@nuway.com.au","Brisbane South"],
         ["western-suburbs","Western Suburbs","12 Jennifer Street","Seventeen Mile Rocks","4073","07 3715 6200","western@nuway.com.au","Brisbane West"],
         ["pine-rivers","Pine Rivers","93 South Pine Road","Brendale","4500","07 3881 1447","pineriver@nuway.com.au","Brisbane North"],
         ["mango-hill","Mango Hill","1823 Anzac Avenue","Mango Hill","4509","07 3491 6372","mangohill@nuway.com.au","Brisbane North"],
         ["burpengary","Burpengary","8A, 1 Commerce Place","Burpengary","4505","07 3888 8806","burpengary@nuway.com.au","Brisbane North"],
         ["ormeau","Ormeau","7 Eggersdorf Road","Ormeau","4208","07 5546 7703","ormeau@nuway.com.au","Gold Coast"],
         ["ashmore","Ashmore","650 Southport Nerang Road","Ashmore","4214","07 5597 3433","ashmore@nuway.com.au","Gold Coast"],
         ["buderim","Buderim","168 Crosby Hill Road","Tanawha","4556","07 5445 2173","buderim@nuway.com.au","Sunshine Coast"],
       ].map(([slug,name,address,suburb,postcode,phone,store_email,region], i) =>
             ({ id: "loc-" + slug, slug, name, address, suburb, postcode, phone, store_email, hiring_email: null, region, sort_order: (i+1)*10, active: true }));

   const L = (slug) => demoLocations.find(l => l.slug === slug);
    const demoJobs = [
      { id:"job-1", slug:"hr-driver-logan", title:"HR Truck Driver — Logan", location_id:L("logan").id, all_locations:false,
             role_types:["Driver"], employment_type:"Full-time",
             summary:"Deliver landscape supplies across Brisbane South in our own fleet. Local runs, home every night.",
             description:"You will drive one of our tipper trucks delivering bulk materials, pavers and retaining wall products to homes and job sites around Logan and the southern suburbs.\n\n**A typical day**\n\n- Pre-start checks and load-up in the yard\n- 6 to 10 local deliveries using our run-sheet app\n- Tip, crane or hand-unload depending on the product\n- Back in the yard by mid-afternoon most days",
             requirements:"- Current HR licence (MR considered for the right person)\n- Clean driving record\n- Comfortable operating a loader (we can train)\n- Happy to help customers in the yard between runs",
             pay_text:"", status:"live", on_seek:false, seek_url:null, accept_direct:true, closes_on:null, published_at:"2026-09-14T00:00:00Z", created_at:"2026-09-14T00:00:00Z" },
      { id:"job-2", slug:"sales-yard-mango-hill", title:"Sales & Yard — Mango Hill", location_id:L("mango-hill").id, all_locations:false,
             role_types:["Sales","Yard"], employment_type:"Full-time",
             summary:"Counter sales and yard work at our Mango Hill store. Landscaping or trade knowledge a plus.",
             description:"A hands-on role split between serving customers at the counter and working in the yard loading orders.\n\nYou will quote pavers, bulk materials and retaining walls, help DIY customers work out how much they need, and keep the yard tidy and stocked.",
             requirements:"- Retail or trade experience\n- Forklift ticket (or willing to get one)\n- Weekend availability on a roster\n- Physically fit — this is an outdoor role",
             pay_text:"", status:"live", on_seek:true, seek_url:"https://www.seek.com.au/", accept_direct:true, closes_on:null, published_at:"2026-09-16T00:00:00Z", created_at:"2026-09-16T00:00:00Z" },
      { id:"job-3", slug:"assistant-manager-ashmore", title:"Assistant Store Manager — Ashmore", location_id:L("ashmore").id, all_locations:false,
             role_types:["Assistant Manager","Sales"], employment_type:"Full-time",
             summary:"Second-in-charge at our busiest Gold Coast yard. Lead the counter, run the roster, back the manager.",
             description:"Support the store manager running day-to-day operations at Ashmore: opening and closing, rostering, stock counts, trade accounts and keeping the customer experience sharp.\n\nYou will step up to run the store when the manager is away.",
             requirements:"- 2+ years in retail, trade supply or landscaping\n- Confident leading a small team\n- Forklift ticket\n- Comfortable with point-of-sale and stock systems",
             pay_text:"", status:"live", on_seek:true, seek_url:"https://www.seek.com.au/", accept_direct:false, closes_on:null, published_at:"2026-09-10T00:00:00Z", created_at:"2026-09-10T00:00:00Z" },
      { id:"job-4", slug:"casual-yard-all-stores", title:"Casual Yard Hands — all stores", location_id:null, all_locations:true,
             role_types:["Yard"], employment_type:"Casual",
             summary:"Weekend and school-holiday yard work across South East Queensland. Tell us which store suits you.",
             description:"We're always keen to hear from reliable people for casual yard work — loading customer vehicles, keeping bays tidy, helping with deliveries.\n\nPick the store closest to you when you apply.",
             requirements:"- 18+\n- Physically fit and happy outdoors\n- Weekend availability\n- Forklift ticket a bonus, not essential",
             pay_text:"", status:"live", on_seek:false, seek_url:null, accept_direct:true, closes_on:null, published_at:"2026-09-01T00:00:00Z", created_at:"2026-09-01T00:00:00Z" },
      { id:"job-5", slug:"mr-driver-buderim-draft", title:"MR Driver — Buderim", location_id:L("buderim").id, all_locations:false,
             role_types:["Driver"], employment_type:"Part-time",
             summary:"Part-time delivery driver, 3 days a week.", description:"Draft — not yet published.", requirements:"", pay_text:"",
             status:"draft", on_seek:false, seek_url:null, accept_direct:true, closes_on:null, published_at:null, created_at:"2026-09-18T00:00:00Z" },
        ];
    const demoApplications = [];

   const withLocation = (job, locations) => {
         const l = locations.find(x => x.id === job.location_id);
         return Object.assign({}, job, {
                 location_name: l ? l.name : null, location_suburb: l ? l.suburb : null, location_region: l ? l.region : null,
         });
   };

   // ---------------- supabase client ----------------
   let sb = null;
    async function client() {
          if (DEMO) return null;
          if (sb) return sb;
          const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
          sb = mod.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          return sb;
    }

   const api = {
         DEMO,
         client,

         // ----- public -----
         async locations() {
                 if (DEMO) return demoLocations.filter(l => l.active).sort((a,b)=>a.sort_order-b.sort_order);
                 const s = await client();
                 const { data, error } = await s.from("careers_locations").select("*").eq("active", true).order("sort_order");
                 if (error) throw error;
                 return data;
         },
         async liveJobs() {
                 if (DEMO) {
                           return demoJobs.filter(j => j.status === "live").map(j => withLocation(j, demoLocations))
                             .sort((a,b) => (b.published_at||"").localeCompare(a.published_at||""));
                 }
                 const s = await client();
                 const { data, error } = await s.from("careers_live_jobs").select("*").order("published_at", { ascending: false });
                 if (error) throw error;
                 return data;
         },
         async uploadCv(file) {
                 const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
                 const path = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}_${safe}`;
                 if (DEMO) { await new Promise(r => setTimeout(r, 400)); return { path, filename: file.name }; }
                 const s = await client();
                 const { error } = await s.storage.from("careers-cvs").upload(path, file, { contentType: file.type, upsert: false });
                 if (error) throw error;
                 return { path, filename: file.name };
         },
         async submitApplication(row) {
                 if (DEMO) { await new Promise(r => setTimeout(r, 500)); demoApplications.push(Object.assign({ id: "app-" + Date.now(), created_at: new Date().toISOString(), status: "new" }, row)); return; }
                 const s = await client();
                 const { error } = await s.from("careers_applications").insert(row);
                 if (error) throw error;
         },

         // ----- admin -----
         async signIn(email, password) {
                 if (DEMO) return { user: { email } };
                 const s = await client();
                 const { data, error } = await s.auth.signInWithPassword({ email, password });
                 if (error) throw error;
                 return data;
         },
         async magicLink(email) {
                 if (DEMO) return;
                 const s = await client();
                 const { error } = await s.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } });
                 if (error) throw error;
         },
         async session() {
                 if (DEMO) return { user: { email: "demo@nuway.com.au" } };
                 const s = await client();
                 const { data } = await s.auth.getSession();
                 return data.session;
         },
         async signOut() { if (DEMO) return; const s = await client(); await s.auth.signOut(); },
         async isAdmin() {
                 if (DEMO) return true;
                 const s = await client();
                 const { data, error } = await s.rpc("careers_is_admin");
                 if (error) throw error;
                 return !!data;
         },
         async allJobs() {
                 if (DEMO) return demoJobs.map(j => withLocation(j, demoLocations)).map(j => Object.assign(j, { total_applications: demoApplications.filter(a=>a.job_id===j.id).length, new_applications: demoApplications.filter(a=>a.job_id===j.id && a.status==="new").length }));
                 const s = await client();
                 const [{ data: jobs, error }, { data: stats }, { data: locs }] = await Promise.all([
                           s.from("careers_jobs").select("*").order("created_at", { ascending: false }),
                           s.from("careers_job_stats").select("*"),
                           s.from("careers_locations").select("*"),
                         ]);
                 if (error) throw error;
                 return jobs.map(j => {
                           const st = (stats||[]).find(x => x.job_id === j.id) || {};
                           return Object.assign(withLocation(j, locs||[]), { total_applications: st.total_applications||0, new_applications: st.new_applications||0 });
                 });
         },
         async saveJob(job) {
                 if (DEMO) {
                           if (job.id) { Object.assign(demoJobs.find(j => j.id === job.id), job); }
                           else { job.id = "job-" + Date.now(); job.created_at = new Date().toISOString(); job.published_at = job.status === "live" ? job.created_at : null; demoJobs.unshift(job); }
                           return job;
                 }
                 const s = await client();
                 const q = job.id ? s.from("careers_jobs").update(job).eq("id", job.id) : s.from("careers_jobs").insert(job);
                 const { data, error } = await q.select().single();
                 if (error) throw error;
                 return data;
         },
         async deleteJob(id) {
                 if (DEMO) { const i = demoJobs.findIndex(j => j.id === id); if (i > -1) demoJobs.splice(i, 1); return; }
                 const s = await client();
                 const { error } = await s.from("careers_jobs").delete().eq("id", id);
                 if (error) throw error;
         },
         async allLocations() {
                 if (DEMO) return demoLocations.slice().sort((a,b)=>a.sort_order-b.sort_order);
                 const s = await client();
                 const { data, error } = await s.from("careers_locations").select("*").order("sort_order");
                 if (error) throw error;
                 return data;
         },
         async saveLocation(loc) {
                 if (DEMO) { Object.assign(demoLocations.find(l => l.id === loc.id) || {}, loc); return loc; }
                 const s = await client();
                 const { data, error } = await s.from("careers_locations").update(loc).eq("id", loc.id).select().single();
                 if (error) throw error;
                 return data;
         },
         async applications(filter) {
                 if (DEMO) return demoApplications.slice().reverse().map(a => Object.assign({}, a, { job_title: (demoJobs.find(j=>j.id===a.job_id)||{}).title, location_name: (demoLocations.find(l=>l.id===a.location_id)||{}).name }));
                 const s = await client();
                 let q = s.from("careers_applications").select("*, careers_jobs(title), careers_locations(name)").order("created_at", { ascending: false }).limit(500);
                 if (filter && filter.job_id) q = q.eq("job_id", filter.job_id);
                 if (filter && filter.status) q = q.eq("status", filter.status);
                 const { data, error } = await q;
                 if (error) throw error;
                 return data.map(a => Object.assign(a, { job_title: a.careers_jobs ? a.careers_jobs.title : null, location_name: a.careers_locations ? a.careers_locations.name : null }));
         },
         async updateApplication(id, patch) {
                 if (DEMO) { Object.assign(demoApplications.find(a => a.id === id) || {}, patch); return; }
                 const s = await client();
                 const { error } = await s.from("careers_applications").update(patch).eq("id", id);
                 if (error) throw error;
         },
         async cvUrl(path) {
                 if (DEMO) return "#demo-cv";
                 const s = await client();
                 const { data, error } = await s.storage.from("careers-cvs").createSignedUrl(path, 600);
                 if (error) throw error;
                 return data.signedUrl;
         },
   };

   // ---------------- helpers ----------------
   api.esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    // Minimal, safe markdown: paragraphs, **bold**, bullet lists, #### headings
   api.md = (src) => {
         const lines = String(src || "").split(/\r?\n/);
         let html = "", inList = false, para = [];
         const inline = (t) => api.esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
         const flush = () => { if (para.length) { html += "<p>" + inline(para.join(" ")) + "</p>"; para = []; } };
         for (const raw of lines) {
                 const l = raw.trim();
                 if (/^[-*] /.test(l)) { flush(); if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inline(l.slice(2)) + "</li>"; continue; }
                 if (inList) { html += "</ul>"; inList = false; }
                 if (/^#{1,4} /.test(l)) { flush(); html += "<h4>" + inline(l.replace(/^#+ /, "")) + "</h4>"; continue; }
                 if (!l) { flush(); continue; }
                 para.push(l);
         }
         if (inList) html += "</ul>";
         flush();
         return html;
   };
    api.slugify = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    api.fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";

   window.Careers = api;
})();
