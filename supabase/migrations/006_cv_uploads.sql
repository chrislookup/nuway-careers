-- =====================================================================
-- Nuway Careers — widen what the CV upload accepts
--
-- A lot of applicants for yard, driver and counter roles apply from a
-- phone and photograph their resume rather than export a PDF. Photos are
-- also bigger than documents, so the limit goes up with them.
--
--   PDF / Word            unchanged
--   JPEG / PNG / HEIC     new (HEIC is the iPhone camera default)
--   5 MB -> 10 MB
--
-- Careers storage only. No HR table, policy or function is modified.
-- =====================================================================

update storage.buckets
   set file_size_limit = 10485760,          -- 10 MB
       allowed_mime_types = array[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'image/jpeg',
         'image/png',
         'image/heic',
         'image/heif'
       ]
 where id = 'careers-cvs';

select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'careers-cvs';
