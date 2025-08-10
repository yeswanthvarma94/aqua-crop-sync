-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.account_member_role as enum ('manager','partner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tank_type as enum ('shrimp','fish');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_category as enum ('feed','medicine','equipment','others');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_unit as enum ('kg','liters','bags','pieces');
exception when duplicate_object then null; end $$;

-- Security definer helpers (avoid recursive RLS)
create or replace function public.is_account_owner(_account_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.accounts a where a.id = _account_id and a.owner_id = _user_id
  );
$$;

create or replace function public.is_account_member(_account_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    exists (select 1 from public.accounts a where a.id = _account_id and a.owner_id = _user_id)
    or exists (select 1 from public.account_members m where m.account_id = _account_id and m.user_id = _user_id)
  );
$$;

-- Core tables
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

-- Policies for accounts
create policy if not exists "Accounts are viewable by members"
  on public.accounts for select
  to authenticated
  using (public.is_account_member(id, auth.uid()));

create policy if not exists "Users can create their own account"
  on public.accounts for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy if not exists "Only owners can update their account"
  on public.accounts for update
  to authenticated
  using (public.is_account_owner(id, auth.uid()));

create policy if not exists "Only owners can delete their account"
  on public.accounts for delete
  to authenticated
  using (public.is_account_owner(id, auth.uid()));

-- Account members
create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null,
  role public.account_member_role not null default 'manager',
  created_at timestamptz not null default now(),
  unique (account_id, user_id)
);

alter table public.account_members enable row level security;

create policy if not exists "Members can read memberships of their accounts"
  on public.account_members for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can manage memberships (insert)"
  on public.account_members for insert
  to authenticated
  with check (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can manage memberships (update)"
  on public.account_members for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can manage memberships (delete)"
  on public.account_members for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Locations
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  unique (account_id, name)
);

alter table public.locations enable row level security;

create policy if not exists "Members can view locations"
  on public.locations for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can insert locations"
  on public.locations for insert
  to authenticated
  with check (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can update locations"
  on public.locations for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can delete locations"
  on public.locations for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Tanks
create table if not exists public.tanks (
  id uuid primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  type public.tank_type not null,
  created_at timestamptz not null default now()
);

alter table public.tanks enable row level security;

create policy if not exists "Members can view tanks"
  on public.tanks for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can insert tanks"
  on public.tanks for insert
  to authenticated
  with check (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can update tanks"
  on public.tanks for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can delete tanks"
  on public.tanks for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Tank crops
create table if not exists public.tank_crops (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  seed_date timestamptz not null,
  end_date timestamptz,
  created_at timestamptz not null default now()
);

-- Ensure only one active crop per tank
create unique index if not exists tank_crops_one_active_per_tank
  on public.tank_crops (tank_id)
  where end_date is null;

alter table public.tank_crops enable row level security;

create policy if not exists "Members can view tank crops"
  on public.tank_crops for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can insert tank crops"
  on public.tank_crops for insert
  to authenticated
  with check (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can update tank crops"
  on public.tank_crops for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can delete tank crops"
  on public.tank_crops for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Stocks
create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  category public.stock_category not null,
  unit public.stock_unit not null,
  quantity numeric not null default 0,
  price_per_unit numeric not null default 0,
  total_amount numeric not null default 0,
  min_stock numeric not null default 0,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  unique (location_id, name, category, unit)
);

create index if not exists idx_stocks_location on public.stocks(location_id);

alter table public.stocks enable row level security;

create policy if not exists "Members can view stocks"
  on public.stocks for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can insert stocks"
  on public.stocks for insert
  to authenticated
  with check (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can update stocks"
  on public.stocks for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can delete stocks"
  on public.stocks for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Material logs
create table if not exists public.material_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  quantity numeric not null,
  time timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_material_logs_loc_tank_time on public.material_logs(location_id, tank_id, time);

alter table public.material_logs enable row level security;

create policy if not exists "Members can view material logs"
  on public.material_logs for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can insert material logs"
  on public.material_logs for insert
  to authenticated
  with check (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can update material logs"
  on public.material_logs for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can delete material logs"
  on public.material_logs for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  tank_id uuid references public.tanks(id) on delete set null,
  category text,
  amount numeric not null default 0,
  description text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_account on public.expenses(account_id);

alter table public.expenses enable row level security;

create policy if not exists "Members can view expenses"
  on public.expenses for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can insert expenses"
  on public.expenses for insert
  to authenticated
  with check (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can update expenses"
  on public.expenses for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can delete expenses"
  on public.expenses for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Pending changes queue
create table if not exists public.pending_changes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  created_by uuid,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint pending_status_valid check (status in ('pending','approved','rejected'))
);

create index if not exists idx_pending_changes_account_status_created on public.pending_changes(account_id, status, created_at desc);

alter table public.pending_changes enable row level security;

create policy if not exists "Members can view pending changes"
  on public.pending_changes for select
  to authenticated
  using (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Members can insert pending changes"
  on public.pending_changes for insert
  to authenticated
  with check (public.is_account_member(account_id, auth.uid()));

create policy if not exists "Only owners can update pending changes"
  on public.pending_changes for update
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

create policy if not exists "Only owners can delete pending changes"
  on public.pending_changes for delete
  to authenticated
  using (public.is_account_owner(account_id, auth.uid()));

-- Trigger to set created_by on pending_changes
create or replace function public.set_pending_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_pending_created_by on public.pending_changes;
create trigger trg_set_pending_created_by
before insert on public.pending_changes
for each row execute function public.set_pending_created_by();

-- Ensure owner has a membership row for convenience
create or replace function public.handle_account_insert_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- insert membership for owner if not exists
  insert into public.account_members (account_id, user_id, role)
  values (new.id, new.owner_id, 'manager')
  on conflict (account_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_accounts_owner_membership on public.accounts;
create trigger trg_accounts_owner_membership
after insert on public.accounts
for each row execute function public.handle_account_insert_membership();

-- No-op RPC used by UI (safe placeholder)
create or replace function public.noop()
returns void
language plpgsql
stable
as $$ begin return; end; $$;