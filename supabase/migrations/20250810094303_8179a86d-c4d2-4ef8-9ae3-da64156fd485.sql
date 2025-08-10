-- Create required extensions
create extension if not exists pgcrypto;

-- Utility: auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Utility: membership checker (owner or member)
create or replace function public.is_account_member(_user_id uuid, _account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = _account_id and a.owner_id = _user_id
  )
  or exists (
    select 1 from public.account_members m
    where m.account_id = _account_id and m.user_id = _user_id
  );
$$;

-- No-op RPC used by UI
create or replace function public.noop()
returns boolean
language sql
stable
as $$ select true; $$;

-- Accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create trigger trg_accounts_updated
before update on public.accounts
for each row execute function public.update_updated_at_column();

-- Account members
create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  user_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, user_id)
);
create index if not exists idx_account_members_account on public.account_members(account_id);
create index if not exists idx_account_members_user on public.account_members(user_id);

alter table public.account_members enable row level security;

create trigger trg_account_members_updated
before update on public.account_members
for each row execute function public.update_updated_at_column();

-- Locations
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_locations_account on public.locations(account_id);

alter table public.locations enable row level security;

create trigger trg_locations_updated
before update on public.locations
for each row execute function public.update_updated_at_column();

-- Tanks
create table if not exists public.tanks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  location_id uuid not null,
  name text not null,
  type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tanks_account on public.tanks(account_id);
create index if not exists idx_tanks_location on public.tanks(location_id);

alter table public.tanks enable row level security;

create trigger trg_tanks_updated
before update on public.tanks
for each row execute function public.update_updated_at_column();

-- Tank crops
create table if not exists public.tank_crops (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  tank_id uuid not null,
  seed_date timestamptz not null,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tank_crops_account on public.tank_crops(account_id);
create index if not exists idx_tank_crops_tank on public.tank_crops(tank_id);

alter table public.tank_crops enable row level security;

create trigger trg_tank_crops_updated
before update on public.tank_crops
for each row execute function public.update_updated_at_column();

-- Stocks
create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  location_id uuid not null,
  name text not null,
  category text not null,
  unit text not null,
  quantity numeric not null default 0,
  price_per_unit numeric not null default 0,
  total_amount numeric not null default 0,
  min_stock numeric not null default 0,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_stocks_account on public.stocks(account_id);
create index if not exists idx_stocks_location on public.stocks(location_id);
create index if not exists idx_stocks_name on public.stocks(name);

alter table public.stocks enable row level security;

create trigger trg_stocks_updated
before update on public.stocks
for each row execute function public.update_updated_at_column();

-- Material logs
create table if not exists public.material_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  location_id uuid not null,
  tank_id uuid not null,
  stock_id uuid not null,
  quantity numeric not null,
  time timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_material_logs_account on public.material_logs(account_id);
create index if not exists idx_material_logs_location on public.material_logs(location_id);
create index if not exists idx_material_logs_tank on public.material_logs(tank_id);
create index if not exists idx_material_logs_stock on public.material_logs(stock_id);
create index if not exists idx_material_logs_time on public.material_logs(time);

alter table public.material_logs enable row level security;

create trigger trg_material_logs_updated
before update on public.material_logs
for each row execute function public.update_updated_at_column();

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  location_id uuid,
  tank_id uuid,
  category text,
  amount numeric not null default 0,
  description text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_expenses_account on public.expenses(account_id);
create index if not exists idx_expenses_location on public.expenses(location_id);
create index if not exists idx_expenses_tank on public.expenses(tank_id);
create index if not exists idx_expenses_date on public.expenses(date);

alter table public.expenses enable row level security;

create trigger trg_expenses_updated
before update on public.expenses
for each row execute function public.update_updated_at_column();

-- Pending changes (approvals queue)
create table if not exists public.pending_changes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  created_by uuid,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_pending_changes_account on public.pending_changes(account_id);
create index if not exists idx_pending_changes_status on public.pending_changes(status);
create index if not exists idx_pending_changes_created_at on public.pending_changes(created_at);

alter table public.pending_changes enable row level security;

create trigger trg_pending_changes_updated
before update on public.pending_changes
for each row execute function public.update_updated_at_column();

-- RLS Policies
-- Accounts
create policy if not exists "Accounts viewable by members"
  on public.accounts for select
  to authenticated
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.account_members m
      where m.account_id = accounts.id and m.user_id = auth.uid()
    )
  );

create policy if not exists "Users can create their own accounts"
  on public.accounts for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy if not exists "Only owners can update accounts"
  on public.accounts for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "Only owners can delete accounts"
  on public.accounts for delete
  to authenticated
  using (owner_id = auth.uid());

-- Account members
create policy if not exists "Members and owners can view account members"
  on public.account_members for select
  to authenticated
  using (
    user_id = auth.uid() or exists (
      select 1 from public.accounts a where a.id = account_id and a.owner_id = auth.uid()
    )
  );

create policy if not exists "Only owners can add members"
  on public.account_members for insert
  to authenticated
  with check (exists (
    select 1 from public.accounts a where a.id = account_id and a.owner_id = auth.uid()
  ));

create policy if not exists "Only owners can modify members"
  on public.account_members for update
  to authenticated
  using (exists (select 1 from public.accounts a where a.id = account_id and a.owner_id = auth.uid()))
  with check (exists (select 1 from public.accounts a where a.id = account_id and a.owner_id = auth.uid()));

create policy if not exists "Only owners can delete members"
  on public.account_members for delete
  to authenticated
  using (exists (select 1 from public.accounts a where a.id = account_id and a.owner_id = auth.uid()));

-- Generic helper to apply membership policy
-- Locations
create policy if not exists "Members can view locations"
  on public.locations for select to authenticated
  using (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can insert locations"
  on public.locations for insert to authenticated
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can update locations"
  on public.locations for update to authenticated
  using (public.is_account_member(auth.uid(), account_id))
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can delete locations"
  on public.locations for delete to authenticated
  using (public.is_account_member(auth.uid(), account_id));

-- Tanks
create policy if not exists "Members can view tanks"
  on public.tanks for select to authenticated
  using (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can insert tanks"
  on public.tanks for insert to authenticated
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can update tanks"
  on public.tanks for update to authenticated
  using (public.is_account_member(auth.uid(), account_id))
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can delete tanks"
  on public.tanks for delete to authenticated
  using (public.is_account_member(auth.uid(), account_id));

-- Tank crops
create policy if not exists "Members can view tank crops"
  on public.tank_crops for select to authenticated
  using (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can insert tank crops"
  on public.tank_crops for insert to authenticated
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can update tank crops"
  on public.tank_crops for update to authenticated
  using (public.is_account_member(auth.uid(), account_id))
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can delete tank crops"
  on public.tank_crops for delete to authenticated
  using (public.is_account_member(auth.uid(), account_id));

-- Stocks
create policy if not exists "Members can view stocks"
  on public.stocks for select to authenticated
  using (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can insert stocks"
  on public.stocks for insert to authenticated
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can update stocks"
  on public.stocks for update to authenticated
  using (public.is_account_member(auth.uid(), account_id))
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can delete stocks"
  on public.stocks for delete to authenticated
  using (public.is_account_member(auth.uid(), account_id));

-- Material logs
create policy if not exists "Members can view material logs"
  on public.material_logs for select to authenticated
  using (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can insert material logs"
  on public.material_logs for insert to authenticated
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can update material logs"
  on public.material_logs for update to authenticated
  using (public.is_account_member(auth.uid(), account_id))
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can delete material logs"
  on public.material_logs for delete to authenticated
  using (public.is_account_member(auth.uid(), account_id));

-- Expenses
create policy if not exists "Members can view expenses"
  on public.expenses for select to authenticated
  using (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can insert expenses"
  on public.expenses for insert to authenticated
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can update expenses"
  on public.expenses for update to authenticated
  using (public.is_account_member(auth.uid(), account_id))
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can delete expenses"
  on public.expenses for delete to authenticated
  using (public.is_account_member(auth.uid(), account_id));

-- Pending changes
create policy if not exists "Members can view their pending changes"
  on public.pending_changes for select to authenticated
  using (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can insert pending changes"
  on public.pending_changes for insert to authenticated
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can update pending changes"
  on public.pending_changes for update to authenticated
  using (public.is_account_member(auth.uid(), account_id))
  with check (public.is_account_member(auth.uid(), account_id));
create policy if not exists "Members can delete pending changes"
  on public.pending_changes for delete to authenticated
  using (public.is_account_member(auth.uid(), account_id));