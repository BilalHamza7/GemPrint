-- GemPrint-managed credentials: passwords are bcrypt hashes created by the Node API.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists laboratory_name text;
alter table public.profiles add column if not exists legal_business_name text;
alter table public.profiles add column if not exists business_registration_number text;
alter table public.profiles add column if not exists business_email text;
alter table public.profiles add column if not exists business_phone text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists address_line_1 text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_email_unique on public.profiles (lower(email));
