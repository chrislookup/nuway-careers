-- =====================================================================
-- Nuway Careers — four casual "flexible hours" job templates
--
-- These are for the careers page's own adverts, not SEEK. They target
-- people who do not want full-time work: students, parents, people
-- winding back hours, second-jobbers, weekend drivers.
--
-- Pay shown publicly: General Retail Industry Award Level 3 casual,
-- $36.11/hr from 1 July 2026, plus evening/weekend/public-holiday rates.
-- Update pay_text on each template when the award changes (every 1 July).
--
-- House rules baked into the wording:
--   * The store sets the roster. We work with people on a pattern that
--     suits; they do not dictate their days.
--   * Forklift / front end loader tickets: we help arrange the training,
--     the employee pays for it.
--
-- The store is never baked in: {store} in the title is filled in when a
-- job is posted from the template. Re-running this file overwrites the
-- four templates by name and leaves any others alone.
-- =====================================================================

insert into careers_job_templates
  (name, title, role_types, employment_type, summary, description, requirements, pay_text, email_mode, created_by)
values

-- ---------------------------------------------------------------------
-- 1. Counter sales
-- ---------------------------------------------------------------------
( 'Casual counter sales (flexible hours)',
  'Casual Counter Sales — {store}',
  array['Sales']::careers_role_type[],
  'Casual',
  'Counter sales 2–4 days a fortnight, more in school holidays and peak season. Suits study, family commitments or winding back the hours.',
$desc$A casual counter role at our {store} store for someone who wants steady part-time hours that fit around the rest of their life.

#### The hours

- Around 2 to 4 days a fortnight as the baseline, including some weekend shifts
- More on offer through school holidays, spring (September to November), the run-up to Christmas and Easter
- The store sets the roster ahead of time, and we'll work with you on a pattern that fits around uni, TAFE, school pick-up or another job

#### What you'll do

- Serve customers at the counter and on the phone
- Help homeowners work out what they need and how much — soil, sand, mulch, pavers, turf, retaining walls
- Quote, take payment and book deliveries on our point-of-sale system
- Work with the yard team to get customer pick-ups and deliveries sorted
- Keep the front of shop tidy and the price tags current

No landscaping background needed. If you're good with people and happy to learn the products, we'll teach you the rest.$desc$,
$req$- Reliable and comfortable talking to customers
- Available at least two days a fortnight, including some weekends
- Comfortable with a computer, point of sale and basic maths
- Retail, trade counter or hospitality experience helps, not essential
- Right to work in Australia$req$,
  '$36.11/hr casual (Retail Award Level 3) + evening, weekend and public holiday rates',
  'store', 'seed'),

-- ---------------------------------------------------------------------
-- 2. Yard hand
-- ---------------------------------------------------------------------
( 'Casual yard hand (flexible hours)',
  'Casual Yard Hand — {store}',
  array['Yard']::careers_role_type[],
  'Casual',
  'Hands-on yard work 2–4 days a fortnight, more in school holidays and peak season. Outdoors and on your feet, with hours that fit around study or family.',
$desc$Casual yard work at our {store} store. Outdoors, physical, and a good fit for someone who needs part-time hours around study, family or another job.

#### The hours

- Around 2 to 4 days a fortnight as the baseline, including some weekend shifts
- More through school holidays, spring (September to November), the run-up to Christmas and Easter
- The store sets the roster ahead of time, and we'll work with you on a pattern that suits

#### What you'll do

- Load customer vehicles and trailers — bulk materials, pavers, wall blocks
- Pick and pack orders for the counter team and for delivery
- Keep the bays stocked, swept, safe and tidy
- Help the drivers load and check off deliveries
- Point customers to the right product and grab a salesperson when they need a quote

You'll be on your feet and lifting for most of a shift. A forklift or front end loader ticket is a real advantage. If you don't have one, we can help you arrange the training — the cost is yours, but it's a ticket you keep.$desc$,
$req$- Fit and happy working outdoors in Queensland weather
- Reliable — the yard runs on people turning up
- Available at least two days a fortnight, including some weekends
- Forklift or front end loader ticket highly regarded, or willing to get one (at your own cost; we'll help you arrange it)
- Right to work in Australia$req$,
  '$36.11/hr casual (Retail Award Level 3) + evening, weekend and public holiday rates',
  'store', 'seed'),

-- ---------------------------------------------------------------------
-- 3. Counter + yard combined
-- ---------------------------------------------------------------------
( 'Casual counter and yard (flexible hours)',
  'Casual Counter & Yard — {store}',
  array['Sales','Yard']::careers_role_type[],
  'Casual',
  'Split between the counter and the yard, 2–4 days a fortnight, more in school holidays and peak. Variety, with hours that fit around study or family.',
$desc$A casual role at our {store} store that moves between the counter and the yard, depending on the day and who's in. The most varied job on site.

#### The hours

- Around 2 to 4 days a fortnight as the baseline, including some weekend shifts
- More through school holidays, spring (September to November), the run-up to Christmas and Easter
- The store sets the roster ahead of time, and we'll work with you on a pattern that fits around uni, TAFE, family or another job

#### What you'll do

- Serve and quote at the counter, take payment, book deliveries
- Load customer vehicles and keep the yard stocked, safe and tidy
- Help homeowners work out how much they need
- Back up the drivers and the counter wherever the day is busiest

Suits someone who'd rather not sit still. We'll train the products and the point-of-sale system; you bring the attitude. A forklift or loader ticket is a plus — we can help you arrange the training if you need it, at your own cost.$desc$,
$req$- Good with people and happy to get your hands dirty in the same shift
- Fit for outdoor work and lifting
- Available at least two days a fortnight, including some weekends
- Comfortable with a computer and point of sale
- Retail or trade experience helps; forklift or loader ticket a plus
- Right to work in Australia$req$,
  '$36.11/hr casual (Retail Award Level 3) + evening, weekend and public holiday rates',
  'store', 'seed'),

-- ---------------------------------------------------------------------
-- 4. Truck driver
-- ---------------------------------------------------------------------
( 'Casual truck driver (flexible / weekends)',
  'Casual Truck Driver — {store}',
  array['Driver']::careers_role_type[],
  'Casual',
  'Local tipper runs, one to three days a week. MR or HR licence. Suits a second job, weekend work or winding back from full-time.',
$desc$Casual delivery driving out of our {store} store. Local runs in our own tipper trucks, home the same day, on a part-time pattern we'll work out with you.

#### The hours

- One to three days a week is typical
- Weekend and school-holiday runs available, and extra days through spring (September to November), the run-up to Christmas and Easter
- The store sets the delivery roster, and we'll work with you on which days fit around your other commitments
- No overnight or interstate work — every run starts and finishes at the yard

#### What you'll do

- Pre-start checks and load-up in the yard, and make sure the load is secured
- Deliver soil, sand, mulch, pavers and wall products to homes and job sites around the local area
- Tip, crane or hand-unload depending on the product
- Keep the electronic delivery records straight
- Give the yard a hand between runs

Suits someone with a licence they're not using enough — a second job, work around another commitment, or a way to keep driving without the full-time grind.$desc$,
$req$- Current MR licence as a minimum, HR welcome — manual, not auto-only
- Clean driving record
- Comfortable with tippers and manual unloading
- Loader or forklift ticket a plus; we can help you arrange one at your own cost
- Right to work in Australia$req$,
  '$36.11/hr casual (Retail Award Level 3) + evening, weekend and public holiday rates',
  'store', 'seed')

on conflict (name) do update set
  title = excluded.title, role_types = excluded.role_types, employment_type = excluded.employment_type,
  summary = excluded.summary, description = excluded.description, requirements = excluded.requirements,
  pay_text = excluded.pay_text, email_mode = excluded.email_mode;

select name, title, role_types, length(summary) as summary_chars from careers_job_templates order by name;
