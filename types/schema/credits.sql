-- Credits table — user balance
create table if not exists public.credits (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  user_id uuid not null,
  total bigint not null default 0,
  constraint credits_pkey primary key (id),
  constraint credits_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

-- One credit record per user
create unique index if not exists credits_user_id_idx on public.credits (user_id);

-- Enable RLS
alter table public.credits enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "Users can view own credits" on public.credits;

-- Users can view their own credits
-- NO insert/update/delete — credits managed by server only (service role)
create policy "Users can view own credits"
  on public.credits for select
  using (auth.uid() = user_id);
