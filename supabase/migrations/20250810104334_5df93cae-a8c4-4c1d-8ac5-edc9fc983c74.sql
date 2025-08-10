-- SECURITY HARDENING MIGRATION
-- 1) Audit columns on pending_changes
alter table public.pending_changes
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

-- 2) Tighten RLS policies to enforce owner-only mutations on domain tables
-- Helper: drop existing member mutation policies and recreate owner-only

-- locations
drop policy if exists "Members can insert locations" on public.locations;
drop policy if exists "Members can update locations" on public.locations;
drop policy if exists "Members can delete locations" on public.locations;

create policy "Owners can insert locations"
  on public.locations for insert
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can update locations"
  on public.locations for update
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can delete locations"
  on public.locations for delete
  using (public.current_user_is_account_owner(account_id));

-- tanks
drop policy if exists "Members can insert tanks" on public.tanks;
drop policy if exists "Members can update tanks" on public.tanks;
drop policy if exists "Members can delete tanks" on public.tanks;

create policy "Owners can insert tanks"
  on public.tanks for insert
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can update tanks"
  on public.tanks for update
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can delete tanks"
  on public.tanks for delete
  using (public.current_user_is_account_owner(account_id));

-- tank_crops
drop policy if exists "Members can insert tank crops" on public.tank_crops;
drop policy if exists "Members can update tank crops" on public.tank_crops;
drop policy if exists "Members can delete tank crops" on public.tank_crops;

create policy "Owners can insert tank crops"
  on public.tank_crops for insert
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can update tank crops"
  on public.tank_crops for update
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can delete tank crops"
  on public.tank_crops for delete
  using (public.current_user_is_account_owner(account_id));

-- stocks
drop policy if exists "Members can insert stocks" on public.stocks;
drop policy if exists "Members can update stocks" on public.stocks;
drop policy if exists "Members can delete stocks" on public.stocks;

create policy "Owners can insert stocks"
  on public.stocks for insert
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can update stocks"
  on public.stocks for update
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can delete stocks"
  on public.stocks for delete
  using (public.current_user_is_account_owner(account_id));

-- material_logs
drop policy if exists "Members can insert material logs" on public.material_logs;
drop policy if exists "Members can update material logs" on public.material_logs;
drop policy if exists "Members can delete material logs" on public.material_logs;

create policy "Owners can insert material logs"
  on public.material_logs for insert
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can update material logs"
  on public.material_logs for update
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can delete material logs"
  on public.material_logs for delete
  using (public.current_user_is_account_owner(account_id));

-- expenses
drop policy if exists "Members can insert expenses" on public.expenses;
drop policy if exists "Members can update expenses" on public.expenses;
drop policy if exists "Members can delete expenses" on public.expenses;

create policy "Owners can insert expenses"
  on public.expenses for insert
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can update expenses"
  on public.expenses for update
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can delete expenses"
  on public.expenses for delete
  using (public.current_user_is_account_owner(account_id));

-- 3) Tighten pending_changes policies: members can read/insert, only owners can update/delete

drop policy if exists "Members can update pending changes" on public.pending_changes;
drop policy if exists "Members can delete pending changes" on public.pending_changes;

create policy "Owners can update pending changes"
  on public.pending_changes for update
  using (public.current_user_is_account_owner(account_id))
  with check (public.current_user_is_account_owner(account_id));

create policy "Owners can delete pending changes"
  on public.pending_changes for delete
  using (public.current_user_is_account_owner(account_id));

-- 4) Remove unsafe trigger on auth.users and its function (if present)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();