-- Payments table
create table if not exists public.payments (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null,
  amount bigint not null,
  status text not null default 'open',
  url text null,
  metadata jsonb null,
  constraint payments_pkey primary key (id),
  constraint payments_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

-- Index for querying by user
create index if not exists payments_user_id_idx on public.payments (user_id);

-- Index for querying by status
create index if not exists payments_status_idx on public.payments (status);

-- Enable RLS
alter table public.payments enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Users can create own payments" on public.payments;

-- Users can only view their own payments
create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Users can create payments for themselves (top-up request)
create policy "Users can create own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

-- NO update/delete policy!
-- Status changes only via server (Tripay callback/service role)
