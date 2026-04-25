-- API Keys table
-- (Jika belum dibuat, run ini dulu. Jika sudah ada, skip CREATE TABLE)

create table if not exists public.api_keys (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null,
  name text not null default 'Default',
  key_hash text not null,
  key_prefix text not null,
  key_suffix text not null,
  expires_at timestamp with time zone null,
  last_used_at timestamp with time zone null,
  constraint api_keys_pkey primary key (id),
  constraint api_keys_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

-- Unique constraint on key_hash (one key per hash)
create unique index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

-- Index for querying by user
create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

-- Enable RLS
alter table public.api_keys enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "Users can view own api keys" on public.api_keys;
drop policy if exists "Users can create own api keys" on public.api_keys;
drop policy if exists "Users can delete own api keys" on public.api_keys;
drop policy if exists "Users can update own api keys" on public.api_keys;

-- Users can only see their own keys
create policy "Users can view own api keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

-- Users can create keys for themselves
create policy "Users can create own api keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

-- Users can delete their own keys
create policy "Users can delete own api keys"
  on public.api_keys for delete
  using (auth.uid() = user_id);

-- Users can update their own keys (for last_used_at)
create policy "Users can update own api keys"
  on public.api_keys for update
  using (auth.uid() = user_id);
