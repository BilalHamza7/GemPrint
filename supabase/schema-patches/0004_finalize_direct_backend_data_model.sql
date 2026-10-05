-- Finalize GemPrint's backend-only data model.
-- The browser never reads Supabase directly. The Node API uses the service-role key.

-- Retire the Supabase Auth provisioning path from the original foundation migration.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Keep RLS enabled so anon/authenticated PostgREST clients cannot access application data.
-- The Node API's service-role client bypasses RLS and is the only data access path.
alter table public.profiles enable row level security;
alter table public.gemstone_reports enable row level security;
alter table public.fingerprint_data enable row level security;
alter table public.verification_logs enable row level security;

drop policy if exists "profiles private" on public.profiles;
drop policy if exists "reports private" on public.gemstone_reports;
drop policy if exists "fingerprints private" on public.fingerprint_data;
drop policy if exists "logs private" on public.verification_logs;
drop function if exists public.owns_report(uuid);

-- A report is owned by exactly one GemPrint profile.
alter table public.gemstone_reports
  add column if not exists report_status text not null default 'draft'
  check (report_status in ('draft', 'ready'));

create index if not exists reports_owner_status_created_idx
  on public.gemstone_reports(user_id, report_status, created_at desc);

-- One extraction record belongs to one report. Raw SIFT descriptors are not persisted
-- in PostgreSQL; only the reproducibility metadata and a deterministic hash are stored.
alter table public.fingerprint_data
  add column if not exists algorithm_version text not null default 'sift-clahe-v1';

alter table public.fingerprint_data
  add column if not exists quality_score numeric(5,2)
  check (quality_score is null or (quality_score >= 0 and quality_score <= 100));

alter table public.fingerprint_data
  add column if not exists reference_image_sha256 text;

alter table public.fingerprint_data
  add column if not exists preprocessing_metadata_json jsonb not null default '{}'::jsonb;

alter table public.fingerprint_data
  add column if not exists extracted_at timestamptz not null default now();

-- Every verification attempt is auditable, including an inconclusive result.
alter table public.verification_logs
  add column if not exists algorithm_version text not null default 'sift-clahe-v1';

alter table public.verification_logs
  add column if not exists quality_score numeric(5,2)
  check (quality_score is null or (quality_score >= 0 and quality_score <= 100));

alter table public.verification_logs
  add column if not exists query_image_sha256 text;

alter table public.verification_logs
  add column if not exists reference_image_sha256 text;

create index if not exists verification_logs_report_verified_idx
  on public.verification_logs(matched_gemstone_report_id, verified_at desc);
