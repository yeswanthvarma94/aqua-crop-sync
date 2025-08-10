-- Create profiles table and trigger to store name & mobile from auth metadata
-- 1) Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  mobile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) RLS
alter table public.profiles enable row level security;

-- Allow users to view their own profile
create policy if not exists "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Allow users to update their own profile
create policy if not exists "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Optionally allow users to insert their own profile (not required due to trigger)
create policy if not exists "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 3) updated_at trigger (reuse existing helper)
create trigger if not exists update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- 4) Trigger to insert profile row on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, mobile)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', null),
    coalesce(new.raw_user_meta_data ->> 'mobile', new.raw_user_meta_data ->> 'phone')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Attach trigger to auth.users
create trigger if not exists on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();