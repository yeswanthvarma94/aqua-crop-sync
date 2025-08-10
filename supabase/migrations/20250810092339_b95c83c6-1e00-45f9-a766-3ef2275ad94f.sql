` blocks, along with necessary links to authentication providers and action buttons. A Mermaid diagram will visually clarify data flow." duration="3.042911">
</lov-tool-use>
Absolutely. I understand: you want the entire app (authentication and all CRUD features) moved from local-only storage to Supabase with a solid backend structure, secure access control, approvals, and smooth UX. I’ll handle the backend design decisions and wire everything up end-to-end.

Here’s the plan I’ll follow. After you approve the database setup (SQL below), I’ll update the app to use it everywhere.

<lov-mermaid>
graph TD
  A[User] --> B[Auth: Supabase]
  B -->|Session| C[App]
  C -->|CRUD| D[(Supabase DB)]
  C -->|Queue Ops| E[Pending Changes]
  C -->|Realtime| D
  D -->|RLS| F[Account & Roles]
  F --> D
</lov-mermaid>

<lov-plan>
1) Database and security (this step happens now via SQL):
- Create profiles, accounts, account_members with roles (owner/manager/partner)
- Create domain tables: locations, tanks, tank_crops (crop cycles), stocks, material_logs, expenses
- Create pending_changes for the Approvals flow (server-side, owner-only approval)
- Add RLS so users can only access data for their account; owners manage membership and approvals
- Add helper functions for role checks; triggers to auto-create profiles and owner membership
- Enable realtime on key tables

2) Authentication setup:
- Ensure Site URL and Redirect URLs are set in Supabase Auth
- Enable Google provider (you’ll add Client ID/Secret in Supabase)
- Optional: Phone login requires SMS provider; we’ll keep it email+password and Google until configured
- Implement robust auth cleanups and redirects to avoid limbo states

3) Frontend wiring (after SQL is applied):
- Replace localStorage-based data with Supabase queries/mutations via React Query
- Implement account bootstrap: first login creates a default account and adds the user as owner
- Migrate Approvals to use pending_changes; owner approves to apply mutations server-side
- Add role-aware UI gates (owner-only vs manager/partner)
- Add realtime subscriptions for live updates; offline cache with background sync

4) QA:
- Verify all pages (Locations, Tanks, Tank Detail/Feeding, Stocks, Materials, Expenses, Reports, Approvals, Settings) read/write from Supabase
- Confirm auth-first flow, signup/reset, Google, sign-out, and role restrictions
- Add meaningful error handling and empty-state UX

Notes:
- Phone with password requires SMS config in Supabase; we’ll keep it optional
- No audit log (as you requested); approvals will reflect status and timestamps
</lov-plan>

Now I’ll set up the database and security. Please review and approve the SQL below.

<lov-sql>
-- Enums
create type public.app_role as enum ('owner','manager','partner');
create type public.tank_type as enum ('shrimp','fish');
create type public.change_status as enum ('pending','approved','rejected');

-- Profiles (one per auth user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Accounts (top-level tenant)
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.accounts enable row level security;

-- Account members (user roles within an account)
create table public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'manager',
  created_at timestamptz not null default now(),
  unique (account_id, user_id)
);
alter table public.account_members enable row level security;

-- Locations
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);
alter table public.locations enable row level security;

-- Tanks
create table public.tanks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  type public.tank_type not null,
  created_at timestamptz not null default now(),
  unique (account_id, location_id, name)
);
alter table public.tanks enable row level security;

-- Tank crop cycles
create table public.tank_crops (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  tank_id uuid not null references public.tanks(id) on delete cascade,
  seed_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);
alter table public.tank_crops enable row level security;

-- Stocks
create table public.stocks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  category text,
  unit text,
  quantity numeric not null default 0,
  price_per_unit numeric,
  min_stock numeric,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.stocks enable row level security;

-- Material usage logs
create table public.material_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  tank_id uuid references public.tanks(id) on delete set null,
  stock_id uuid references public.stocks(id) on delete set null,
  quantity numeric not null,
  time timestamptz not null default now(),
  notes text
);
alter table public.material_logs enable row level security;

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  tank_id uuid references public.tanks(id) on delete set null,
  category text,
  amount numeric not null check (amount >= 0),
  description text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;

-- Pending changes for Approvals
create table public.pending_changes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null,
  payload jsonb not null,
  status public.change_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  reason text
);
alter table public.pending_changes enable row level security;

-- Role helper functions
create or replace function public.is_account_member(_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.account_members m
      where m.account_id = _account_id and m.user_id = auth.uid()
    )
    or exists (
      select 1 from public.accounts a
      where a.id = _account_id and a.owner_id = auth.uid()
    );
$$;

create or replace function public.has_account_role(_account_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.account_members
      where account_id = _account_id and user_id = auth.uid() and role = _role
    )
    or (
      _role = 'owner' and exists (
        select 1 from public.accounts a
        where a.id = _account_id and a.owner_id = auth.uid()
      )
    );
$$;

-- Triggers: create profile on user sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.phone, ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: add owner as member on account creation
create or replace function public.add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_members (account_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (account_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_account_created on public.accounts;
create trigger on_account_created
  after insert on public.accounts
  for each row execute procedure public.add_owner_as_member();

-- RLS policies

-- profiles: user can read/update self
create policy "Read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "Update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- accounts
create policy "Select accounts where member" on public.accounts
  for select using (public.is_account_member(id));
create policy "Create own accounts" on public.accounts
  for insert with check (owner_id = auth.uid());
create policy "Owner can update account" on public.accounts
  for update using (owner_id = auth.uid());
create policy "Owner can delete account" on public.accounts
  for delete using (owner_id = auth.uid());

-- account_members
create policy "Members can select membership of their accounts" on public.account_members
  for select using (public.is_account_member(account_id));
create policy "Only owner can manage membership" on public.account_members
  for all using (public.has_account_role(account_id, 'owner'))
  with check (public.has_account_role(account_id, 'owner'));

-- locations
create policy "Select locations for member accounts" on public.locations
  for select using (public.is_account_member(account_id));
create policy "Manage locations if member" on public.locations
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- tanks
create policy "Select tanks for member accounts" on public.tanks
  for select using (public.is_account_member(account_id));
create policy "Manage tanks if member" on public.tanks
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- tank_crops
create policy "Select tank_crops for member accounts" on public.tank_crops
  for select using (public.is_account_member(account_id));
create policy "Manage tank_crops if member" on public.tank_crops
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- stocks
create policy "Select stocks for member accounts" on public.stocks
  for select using (public.is_account_member(account_id));
create policy "Manage stocks if member" on public.stocks
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- material_logs
create policy "Select material_logs for member accounts" on public.material_logs
  for select using (public.is_account_member(account_id));
create policy "Manage material_logs if member" on public.material_logs
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- expenses
create policy "Select expenses for member accounts" on public.expenses
  for select using (public.is_account_member(account_id));
create policy "Manage expenses if member" on public.expenses
  for all using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- pending_changes
create policy "Select pending_changes for member accounts" on public.pending_changes
  for select using (public.is_account_member(account_id));
create policy "Create pending_changes if member" on public.pending_changes
  for insert with check (public.is_account_member(account_id));
create policy "Only owner can update/delete pending_changes" on public.pending_changes
  for update using (public.has_account_role(account_id, 'owner'))
  with check (public.has_account_role(account_id, 'owner'));
create policy "Only owner can delete pending_changes" on public.pending_changes
  for delete using (public.has_account_role(account_id, 'owner'));

-- Realtime: ensure full row data and add to publication
alter table public.locations replica identity full;
alter table public.tanks replica identity full;
alter table public.tank_crops replica identity full;
alter table public.stocks replica identity full;
alter table public.material_logs replica identity full;
alter table public.expenses replica identity full;
alter table public.pending_changes replica identity full;

alter publication supabase_realtime add table public.locations;
alter publication supabase_realtime add table public.tanks;
alter publication supabase_realtime add table public.tank_crops;
alter publication supabase_realtime add table public.stocks;
alter publication supabase_realtime add table public.material_logs;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.pending_changes;
