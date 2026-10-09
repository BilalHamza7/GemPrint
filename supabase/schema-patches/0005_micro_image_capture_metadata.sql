-- Capture context belongs to the registered microscopic reference image.
-- Run once after 0004_finalize_direct_backend_data_model.sql.
alter table public.gemstone_reports
  add column if not exists micro_image_magnification text,
  add column if not exists micro_image_lighting text,
  add column if not exists micro_image_microscope text,
  add column if not exists micro_image_device text,
  add column if not exists micro_image_area_notes text,
  add column if not exists micro_image_captured_on date,
  add column if not exists micro_image_capture_notes text;
