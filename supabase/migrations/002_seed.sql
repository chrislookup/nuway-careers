-- =====================================================================
-- Seed: the 11 Nuway stores, taken from nuway.com.au/stores-contact
-- on 21 Sep 2026. Verify phone numbers and hiring emails before go-live.
-- hiring_email is left NULL => applications go to store_email.
-- =====================================================================

insert into careers_locations (slug, name, address, suburb, postcode, phone, store_email, region, sort_order) values
  ('chandler',        'Chandler',        '2630 Old Cleveland Road',        'Chandler',            '4155', '07 3390 2477', 'chandler@nuway.com.au',   'Brisbane East',    10),
  ('redlands',        'Redlands',        '249 Cleveland-Redland Bay Road', 'Thornlands',          '4164', '07 3207 7800', 'redlands@nuway.com.au',   'Brisbane East',    20),
  ('logan',           'Logan',           '488 Loganlea Road',              'Slacks Creek',        '4127', '07 3808 8442', 'logan@nuway.com.au',      'Brisbane South',   30),
  ('forestdale',      'Forestdale',      '2-16 Staplyton Road',            'Forestdale',          '4118', '07 3800 5433', 'forestdale@nuway.com.au', 'Brisbane South',   40),
  ('western-suburbs', 'Western Suburbs', '12 Jennifer Street',             'Seventeen Mile Rocks','4073', '07 3715 6200', 'western@nuway.com.au',    'Brisbane West',    50),
  ('pine-rivers',     'Pine Rivers',     '93 South Pine Road',             'Brendale',            '4500', '07 3881 1447', 'pineriver@nuway.com.au',  'Brisbane North',   60),
  ('mango-hill',      'Mango Hill',      '1823 Anzac Avenue',              'Mango Hill',          '4509', '07 3491 6372', 'mangohill@nuway.com.au',  'Brisbane North',   70),
  ('burpengary',      'Burpengary',      '8A, 1 Commerce Place',           'Burpengary',          '4505', '07 3888 8806', 'burpengary@nuway.com.au', 'Brisbane North',   80),
  ('ormeau',          'Ormeau',          '7 Eggersdorf Road',              'Ormeau',              '4208', '07 5546 7703', 'ormeau@nuway.com.au',     'Gold Coast',       90),
  ('ashmore',         'Ashmore',         '650 Southport Nerang Road',      'Ashmore',             '4214', '07 5597 3433', 'ashmore@nuway.com.au',    'Gold Coast',      100),
  ('buderim',         'Buderim',         '168 Crosby Hill Road',           'Tanawha',             '4556', '07 5445 2173', 'buderim@nuway.com.au',    'Sunshine Coast',  110)
on conflict (slug) do nothing;

-- First admin. Chris signs in with this email (create the auth user in
-- Supabase > Authentication > Users, or use "Send magic link" from the admin page).
insert into careers_admins (email, name) values ('chris@nuway.com.au', 'Chris')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------
-- Two sample jobs so the page isn't empty during testing. Delete later.
-- ---------------------------------------------------------------------
insert into careers_jobs (slug, title, location_id, role_types, employment_type, summary, description, requirements, status, on_seek, seek_url, accept_direct)
select
  'hr-driver-logan', 'HR Truck Driver — Logan',
  (select id from careers_locations where slug = 'logan'),
  array['Driver']::careers_role_type[], 'Full-time',
  'Deliver landscape supplies across Brisbane South in our own fleet. Local runs, home every night.',
  E'You will drive one of our tipper trucks delivering bulk materials, pavers and retaining wall products to homes and job sites around Logan and the southern suburbs.\n\n**A typical day**\n\n- Pre-start checks and load-up in the yard\n- 6 to 10 local deliveries using our run-sheet app\n- Tip, crane or hand-unload depending on the product\n- Back in the yard by mid-afternoon most days',
  E'- Current HR licence (MR considered for the right person)\n- Clean driving record\n- Comfortable operating a loader (we can train)\n- Happy to help customers in the yard between runs',
  'live', false, null, true
where not exists (select 1 from careers_jobs where slug = 'hr-driver-logan');

insert into careers_jobs (slug, title, location_id, role_types, employment_type, summary, description, requirements, status, on_seek, seek_url, accept_direct)
select
  'sales-yard-mango-hill', 'Sales & Yard — Mango Hill',
  (select id from careers_locations where slug = 'mango-hill'),
  array['Sales','Yard']::careers_role_type[], 'Full-time',
  'Counter sales and yard work at our Mango Hill store. Landscaping or trade knowledge a plus.',
  E'A hands-on role split between serving customers at the counter and working in the yard loading orders.\n\nYou will quote pavers, bulk materials and retaining walls, help DIY customers work out how much they need, and keep the yard tidy and stocked.',
  E'- Retail or trade experience\n- Forklift ticket (or willing to get one)\n- Weekend availability on a roster\n- Physically fit — this is an outdoor role',
  'live', true, 'https://www.seek.com.au/job/00000000', true
where not exists (select 1 from careers_jobs where slug = 'sales-yard-mango-hill');
