-- Create usernames table to map simple handles to auth users per account
create table if not exists public.usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_id uuid not null,
  username text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usernames enable row level security;

-- RLS: members can view usernames for their account
create policy "Members can view usernames of their account"
  on public.usernames for select
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = usernames.account_id
        and m.user_id = auth.uid()
    )
  );

-- RLS: only owners can manage usernames
create policy "Owners can manage usernames"
  on public.usernames for all
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

-- Trigger to maintain updated_at
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists update_usernames_updated_at on public.usernames;
create trigger update_usernames_updated_at
before update on public.usernames
for each row execute function public.update_updated_at_column();

-- Enforce max 5 members (including owner) per account
create or replace function public.enforce_member_limit()
returns trigger as $$
begin
  -- Count distinct users already in the account
  if (
    select count(distinct am.user_id)
    from public.account_members am
    where am.account_id = new.account_id
  ) >= 5 then
    raise exception 'Member limit reached (max 5 including owner)';
  end if;
  return new;
end; $$ language plpgsql security definer set search_path = public;

-- Attach trigger to account_members before insert
drop trigger if exists enforce_member_limit_before_insert on public.account_members;
create trigger enforce_member_limit_before_insert
before insert on public.account_members
for each row execute function public.enforce_member_limit();

-- Update RLS policies on domain tables to make partners read-only
-- EXPENSES
drop policy if exists "Members can insert expenses" on public.expenses;
drop policy if exists "Members can update expenses" on public.expenses;
drop policy if exists "Members can delete expenses" on public.expenses;

create policy "Owners and managers can insert expenses"
  on public.expenses for insert
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = expenses.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can update expenses"
  on public.expenses for update
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = expenses.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = expenses.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can delete expenses"
  on public.expenses for delete
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = expenses.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

-- FEEDING_LOGS
drop policy if exists "Members can insert feeding logs" on public.feeding_logs;
drop policy if exists "Members can update feeding logs" on public.feeding_logs;
drop policy if exists "Members can delete feeding logs" on public.feeding_logs;

create policy "Owners and managers can insert feeding logs"
  on public.feeding_logs for insert
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = feeding_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can update feeding logs"
  on public.feeding_logs for update
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = feeding_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = feeding_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can delete feeding logs"
  on public.feeding_logs for delete
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = feeding_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

-- MATERIAL_LOGS
drop policy if exists "Members can insert material logs" on public.material_logs;
drop policy if exists "Members can update material logs" on public.material_logs;
drop policy if exists "Members can delete material logs" on public.material_logs;

create policy "Owners and managers can insert material logs"
  on public.material_logs for insert
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = material_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can update material logs"
  on public.material_logs for update
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = material_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = material_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can delete material logs"
  on public.material_logs for delete
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = material_logs.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

-- LOCATIONS
drop policy if exists "Members can insert locations" on public.locations;
drop policy if exists "Members can update locations" on public.locations;
drop policy if exists "Members can delete locations" on public.locations;

create policy "Owners and managers can insert locations"
  on public.locations for insert
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = locations.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can update locations"
  on public.locations for update
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = locations.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = locations.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can delete locations"
  on public.locations for delete
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = locations.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

-- TANK CROPS
drop policy if exists "Members can insert tank crops" on public.tank_crops;
drop policy if exists "Members can update tank crops" on public.tank_crops;
drop policy if exists "Members can delete tank crops" on public.tank_crops;

create policy "Owners and managers can insert tank crops"
  on public.tank_crops for insert
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = tank_crops.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can update tank crops"
  on public.tank_crops for update
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = tank_crops.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = tank_crops.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can delete tank crops"
  on public.tank_crops for delete
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = tank_crops.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

-- STOCKS
drop policy if exists "Members can insert stocks" on public.stocks;
drop policy if exists "Members can update stocks" on public.stocks;
drop policy if exists "Members can delete stocks" on public.stocks;

create policy "Owners and managers can insert stocks"
  on public.stocks for insert
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = stocks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can update stocks"
  on public.stocks for update
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = stocks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = stocks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can delete stocks"
  on public.stocks for delete
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = stocks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

-- TANKS
drop policy if exists "Members can insert tanks" on public.tanks;
drop policy if exists "Members can update tanks" on public.tanks;
drop policy if exists "Members can delete tanks" on public.tanks;

create policy "Owners and managers can insert tanks"
  on public.tanks for insert
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = tanks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can update tanks"
  on public.tanks for update
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = tanks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.account_members m
      where m.account_id = tanks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );

create policy "Owners and managers can delete tanks"
  on public.tanks for delete
  using (
    exists (
      select 1 from public.account_members m
      where m.account_id = tanks.account_id
        and m.user_id = auth.uid()
        and m.role in ('owner','manager')
    )
  );