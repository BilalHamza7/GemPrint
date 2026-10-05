-- Run once in the Supabase SQL Editor before enabling archive/restore in production.
alter table public.gemstone_reports
  add column if not exists archived_at timestamptz null;
create index if not exists reports_active_owner_idx
  on public.gemstone_reports(user_id, archived_at, created_at desc);
