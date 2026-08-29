-- StyleSelf — authentication schema
--
-- One `profiles` row per Supabase auth user. It holds the account role
-- (merchant vs. customer) plus lightweight identity fields. The row is created
-- automatically by a trigger on auth.users so the client never has to.
--
-- Apply with either:
--   supabase db push                     (Supabase CLI, linked project)
--   or paste into the SQL editor in the dashboard.

-- ---------------------------------------------------------------------------
-- Role enum
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('merchant', 'customer');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile + role for each auth user. Created automatically on signup.';

alter table public.profiles enable row level security;

-- A user can see and edit only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provision a profile when an auth user is created
--
-- Email/password signups pass `role` and `full_name` in options.data, which
-- lands in raw_user_meta_data. Google OAuth users arrive with `name` but no
-- role, so they default to 'customer' and can be corrected by
-- set_signup_role() immediately after the first sign-in (see below).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    coalesce(
      (nullif(new.raw_user_meta_data ->> 'role', ''))::public.user_role,
      'customer'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- set_signup_role(): let a brand-new OAuth signup record the role the visitor
-- picked on the "Create your account" screen. Only applies to a freshly
-- created, never-modified profile, so it can't flip an established account.
-- ---------------------------------------------------------------------------
create or replace function public.set_signup_role(desired public.user_role)
returns public.user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.user_role;
begin
  update public.profiles
     set role = desired
   where id = auth.uid()
     and created_at > now() - interval '15 minutes'
     and updated_at = created_at
  returning role into result;

  if result is null then
    select role into result from public.profiles where id = auth.uid();
  end if;

  return result;
end;
$$;

revoke all on function public.set_signup_role(public.user_role) from public, anon;
grant execute on function public.set_signup_role(public.user_role) to authenticated;
