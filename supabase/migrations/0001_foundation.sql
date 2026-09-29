-- GemPrint private laboratory data model and ownership controls.
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, created_at timestamptz not null default now());
create table if not exists public.gemstone_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  serial_number text not null, issue_date date not null, species text not null, variety text not null,
  carat_weight numeric(8,3) not null check (carat_weight > 0), colour text not null, cut_shape text not null,
  dimensions text not null, comments text, gemmologist_details text, macro_image_path text, inclusion_image_path text,
  fingerprint_hash text, pdf_path text, created_at timestamptz not null default now(), unique(user_id, serial_number));
create table if not exists public.fingerprint_data (
  id uuid primary key default gen_random_uuid(), gemstone_report_id uuid not null unique references public.gemstone_reports(id) on delete cascade,
  keypoint_count integer not null check(keypoint_count >= 0), descriptor_storage_reference text,
  keypoint_metadata_json jsonb not null default '[]'::jsonb, fingerprint_metadata_json jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.verification_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  matched_gemstone_report_id uuid references public.gemstone_reports(id) on delete set null, match_score numeric(6,2), good_match_count integer,
  inlier_count integer, inlier_ratio numeric(6,5), verdict text not null check(verdict in ('verified','not_verified','inconclusive')),
  reason text, query_image_path text, result_visual_path text, latency_ms integer, verified_at timestamptz not null default now());
create index if not exists reports_owner_idx on public.gemstone_reports(user_id, created_at desc);
create index if not exists logs_owner_idx on public.verification_logs(user_id, verified_at desc);
alter table public.profiles enable row level security;
alter table public.gemstone_reports enable row level security;
alter table public.fingerprint_data enable row level security;
alter table public.verification_logs enable row level security;
create or replace function public.owns_report(report_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.gemstone_reports where id=report_id and user_id=auth.uid()) $$;
drop policy if exists "profiles private" on public.profiles;
create policy "profiles private" on public.profiles for all using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists "reports private" on public.gemstone_reports;
create policy "reports private" on public.gemstone_reports for all using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "fingerprints private" on public.fingerprint_data;
create policy "fingerprints private" on public.fingerprint_data for all using (public.owns_report(gemstone_report_id)) with check (public.owns_report(gemstone_report_id));
drop policy if exists "logs private" on public.verification_logs;
create policy "logs private" on public.verification_logs for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name') on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
insert into storage.buckets(id,name,public,file_size_limit) values('gem_print_media','gem_print_media',false,52428800) on conflict(id) do update set public=false,file_size_limit=52428800;
drop policy if exists "users manage GemPrint media" on storage.objects;
create policy "users manage GemPrint media" on storage.objects for all to authenticated using (bucket_id='gem_print_media' and (storage.foldername(name))[1]=(select auth.uid()::text)) with check (bucket_id='gem_print_media' and (storage.foldername(name))[1]=(select auth.uid()::text));
