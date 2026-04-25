-- Users table
create table if not exists public.users (
  id uuid not null,
  created_at timestamp with time zone not null default now(),
  name text null,
  email text null,
  constraint users_pkey primary key (id),
  constraint users_id_fkey foreign KEY (id) references auth.users (id)
) TABLESPACE pg_default;

-- Index for querying by email
create index if not exists users_email_idx on public.users (email);

-- Enable RLS
alter table public.users enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

-- Users can view their own profile
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own profile (name only)
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);
