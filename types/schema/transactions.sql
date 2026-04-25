-- Transactions (usage/ledger) table
-- credit = top up (+), debit = purchase/usage (-)
create table if not exists public.transactions (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null,
  description text not null,
  amount bigint not null,
  type text not null default 'credit',
  metadata jsonb null,
  constraint transactions_pkey primary key (id),
  constraint transactions_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

-- Index for querying by user
create index if not exists transactions_user_id_idx on public.transactions (user_id);

-- Index for querying by type
create index if not exists transactions_type_idx on public.transactions (type);

-- Enable RLS
alter table public.transactions enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "Users can view own transactions" on public.transactions;

-- Users can only view their own transactions
-- NO insert/update/delete — transactions created by server only (service role)
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);
