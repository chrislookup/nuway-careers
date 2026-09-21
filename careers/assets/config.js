// =====================================================================
// Nuway Careers — configuration
// Fill in SUPABASE_URL and SUPABASE_ANON_KEY from
// Supabase > Project Settings > API. The anon key is safe to publish:
// row-level security decides what it can do.
// Leave both empty to run in DEMO mode (sample data, nothing saved).
// =====================================================================
window.NUWAY_CAREERS = {
  SUPABASE_URL: "https://qaxuyvmftvbkvgdwhlkp.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_I-hZVyI6F6HgYJ4aaqvcxA_y7Yq92ME",

  // Shown in the page header / footer
  SITE_URL: "https://nuway.com.au",
  HEAD_OFFICE_PHONE: "07 3808 8442",

  // Role types offered in filters and forms (must match the DB enum)
  ROLE_TYPES: ["Sales", "Driver", "Yard", "Manager", "Assistant Manager", "Head Office"],
  EMPLOYMENT_TYPES: ["Full-time", "Part-time", "Casual", "Fixed-term"],
  LICENCE_CLASSES: ["None", "C (car)", "LR", "MR", "HR", "HC", "MC"],
  WORKING_RIGHTS: [
    "Australian citizen",
    "Permanent resident",
    "New Zealand citizen",
    "Visa holder with work rights",
    "Other / not sure",
  ],
};
