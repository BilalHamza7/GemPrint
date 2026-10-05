-- GemPrint-managed credentials: passwords are bcrypt hashes created by the Node API.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_email_unique on public.profiles (lower(email));
create table if not exists public.laboratories (id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references public.profiles(id) on delete restrict, legal_name text not null, display_name text not null, registration_number text, business_email text not null, business_phone text, website text, address_line_1 text, city text, country text, verification_status text not null default 'pending' check (verification_status in ('pending','approved','suspended')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.laboratory_members (laboratory_id uuid not null references public.laboratories(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, role text not null check (role in ('owner','admin','gemmologist','viewer')), created_at timestamptz not null default now(), primary key (laboratory_id,user_id));
alter table public.gemstone_reports add column if not exists laboratory_id uuid references public.laboratories(id) on delete restrict;
alter table public.verification_logs add column if not exists laboratory_id uuid references public.laboratories(id) on delete restrict;
create index if not exists gemstone_reports_laboratory_created_idx on public.gemstone_reports(laboratory_id, created_at desc);
create index if not exists verification_logs_laboratory_created_idx on public.verification_logs(laboratory_id, created_at desc);
