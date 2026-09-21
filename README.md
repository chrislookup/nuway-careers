# Nuway Careers

A self-managed careers page for **nuway.com.au/careers**. Head office adds and edits jobs in a
password-protected admin panel — no code changes, no uploads. Candidates apply directly (with CV
upload) or are sent to SEEK, and every application lands in the admin panel *and* in the store
manager's inbox.

```
careers/                 ← the public page (drop-in static site)
  index.html             ← job list, job detail, application form, register-interest form
  admin/                 ← head-office admin panel (jobs, applicants, stores)
  assets/config.js       ← ★ put your Supabase URL + anon key here
  assets/logo-white.svg  ← ★ replace the placeholders with the real logo files
  assets/logo-teal.svg
supabase/
  migrations/001_careers.sql   ← tables, security rules, CV bucket
  migrations/002_seed.sql      ← the 11 stores + 2 sample jobs + first admin
  functions/notify-application ← Edge Function: emails the store via SendGrid
wordpress/
  nuway-careers-embed.php      ← [nuway_careers] shortcode for the live site
```

Until `config.js` has keys, everything runs in **demo mode** with sample data, so the page can be
previewed on GitHub Pages straight away.

---

## 1. Preview on GitHub (5 minutes)

1. Create a new repo (e.g. `nuway-careers`) and push this folder.
2. Repo **Settings → Pages → Source: Deploy from branch → `main` / `/ (root)`**.
3. Open `https://chrislookup.github.io/nuway-careers/careers/` and `.../careers/admin/`.

## 2. Database (10 minutes)

The schema is designed to sit inside the **existing Nuway HR Supabase project** — every table is
prefixed `careers_` and nothing touches the HR tables. (A separate project works just as well.)

1. Supabase → **SQL Editor** → paste and run `supabase/migrations/001_careers.sql`.
2. Run `supabase/migrations/002_seed.sql`. This adds the 11 stores from nuway.com.au, two sample
   jobs, and `chris@nuway.com.au` as the first admin.
3. Admin access: anyone whose HR profile tier is **admin**, after their authenticator (2FA) code.
   There is no separate careers admin list and no way to sign in without 2FA.
4. **Project Settings → API** → copy the *Project URL* and *anon public* key into
   `careers/assets/config.js`. Push. Demo mode switches off.

Adding another careers admin = making them an admin in the HR app. Nothing else to do.

### What the security rules do

| Who | Can |
|---|---|
| Public (anon key) | Read **live** jobs and active stores. Insert an application. Upload a CV (write-only). |
| HR admin, signed in **with 2FA** | Everything: jobs, stores, read/update applications, download CVs. |
| Anyone else, even signed in (or an admin without the 2FA step) | Nothing beyond public. |

CVs live in a private bucket `careers-cvs` (PDF/Word, 5 MB max). The public can put files in but
never list or read them; admins get 10-minute signed links.

## 3. Email notifications via Twilio SendGrid (15 minutes)

Uses the same SendGrid setup planned for the HR app (domain authenticated in Cloudflare).

1. In SendGrid, make sure `nuway.com.au` is authenticated and create an API key with **Mail Send**.
2. Install the Supabase CLI, then from this folder:
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set SENDGRID_API_KEY=SG.xxxx CAREERS_FROM_EMAIL=careers@nuway.com.au CAREERS_CC_EMAIL=chris@nuway.com.au CAREERS_ADMIN_URL=https://nuway.com.au/careers/admin/
   supabase functions deploy notify-application --no-verify-jwt
   ```
3. Supabase → **Database → Webhooks → Create**: table `careers_applications`, event **Insert**,
   type *Supabase Edge Function* → `notify-application`.

Each application then emails the store's **hiring email** (falls back to the store email — set per
store in Admin → Stores), CCs head office, attaches the CV, and sends the applicant a confirmation.

## 4. Move to nuway.com.au (WordPress)

Two options — the shortcode is the least fragile with theme updates.

The app's final home is **`https://nuway.com.au/wp-content/uploads/careers/`** — every path in the
app is relative, so the `careers/` folder can be dropped there unchanged (FTP or the file manager).
The admin is then at `.../uploads/careers/admin/`.

**Shortcode (recommended).** Upload `wordpress/nuway-careers-embed.php` under *Plugins → Add New →
Upload* (zip it first) and activate. Create a page with slug `careers` containing `[nuway_careers]`.
The iframe auto-sizes and hides the app's own header/footer so the WordPress theme's are used.
While the folder is still on GitHub Pages, use
`[nuway_careers src="https://chrislookup.github.io/nuway-careers/careers/"]`.

**Direct.** Or just link to `/wp-content/uploads/careers/` — it works standalone with its own
header and footer.

Either way, keep this repo as the source of truth and push changes from here.

## Day-to-day (for head office)

- **New job**: Admin → Jobs → *+ New job*. Tick one or more role types (Sales + Yard, etc.),
  choose a store or *all stores*, set status **live**. It appears instantly.
- **SEEK role**: tick *also advertised on SEEK* and paste the SEEK link. The card shows an
  *Apply on SEEK* button; untick *also accept applications through our own form* if you only want
  SEEK to receive applications.
- **Pause / close**: change status. Paused hides the job but keeps it ready to relist.
- **Applicants**: filter by role, store or status; click a row to see everything, open the CV, add
  notes, move through *new → reviewed → interviewing → offered → hired / declined*. *Export CSV*
  downloads the current filter.
- **Talent pool**: "Register your interest" submissions show under *Applicants → Talent pool*,
  filtered by store — check it before advertising.

## Brand notes

Colours, type and voice follow the Nuway brand standards: teal `#1B9AAA` for panels and large
text only, slate `#263D42` for body copy, Roboto, Australian spelling, no invented facts. The two
logo SVGs in `careers/assets/` are **placeholders** — replace them with the real script wordmark
(white on slate/teal, teal on white) before anything goes public.
