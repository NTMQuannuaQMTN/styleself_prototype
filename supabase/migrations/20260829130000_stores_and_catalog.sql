-- StyleSelf — merchant stores, team, locations, agent config, catalog
--
-- A "store" is one fashion brand (single- or multi-location). The user who
-- creates it is its owner; others ask to join and an owner/admin approves.
-- Apply after 20260829120000_profiles_and_auth.sql.

-- ===========================================================================
-- Enums
-- ===========================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'store_member_role') then
    create type public.store_member_role as enum ('owner', 'admin', 'member');
  end if;
  if not exists (select 1 from pg_type where typname = 'join_request_status') then
    create type public.join_request_status as enum
      ('pending', 'approved', 'rejected', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'product_status') then
    create type public.product_status as enum ('active', 'draft', 'archived');
  end if;
end
$$;

-- ===========================================================================
-- Shared helpers
-- ===========================================================================
create or replace function public.slugify(v text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(v, '')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- ===========================================================================
-- stores
-- ===========================================================================
create table if not exists public.stores (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 120),
  slug         text not null unique,
  headquarters text,
  agent_live   boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.stores_set_slug()
returns trigger language plpgsql as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  if new.slug is null or new.slug = '' then
    base := nullif(public.slugify(new.name), '');
    if base is null then base := 'store'; end if;
    candidate := base;
    while exists (select 1 from public.stores where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    new.slug := candidate;
  end if;
  return new;
end
$$;

drop trigger if exists stores_set_slug on public.stores;
create trigger stores_set_slug before insert on public.stores
  for each row execute function public.stores_set_slug();

drop trigger if exists stores_updated_at on public.stores;
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- store_members
--
-- user_id -> profiles(id) (not auth.users) so PostgREST can embed the member's
-- profile in a single query. profiles.id is itself an FK to auth.users, so the
-- cascade behaviour is unchanged.
-- ===========================================================================
create table if not exists public.store_members (
  store_id   uuid not null references public.stores (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.store_member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

-- Idempotent: re-point an existing table's FK from auth.users to profiles.
alter table public.store_members
  drop constraint if exists store_members_user_id_fkey;
alter table public.store_members
  add constraint store_members_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- SECURITY DEFINER membership checks — used in policies without RLS recursion.
create or replace function public.is_store_member(p_store uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store and user_id = auth.uid()
  )
$$;

create or replace function public.is_store_manager(p_store uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store and user_id = auth.uid()
      and role in ('owner', 'admin')
  )
$$;

create or replace function public.store_role_is_owner(p_store uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.store_members
    where store_id = p_store and user_id = auth.uid() and role = 'owner'
  )
$$;

-- Do the current user and p_user share any store?
create or replace function public.shares_store_with(p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.store_members a
    join public.store_members b on a.store_id = b.store_id
    where a.user_id = auth.uid() and b.user_id = p_user
  )
$$;

-- Teammates can see each other's profile (name/email) for the roster.
drop policy if exists profiles_select_costore on public.profiles;
create policy profiles_select_costore on public.profiles for select to authenticated
  using (auth.uid() = id or public.shares_store_with(id));

-- ===========================================================================
-- store_agents (1:1 with stores) + store_locations
-- ===========================================================================
create table if not exists public.store_agents (
  store_id     uuid primary key references public.stores (id) on delete cascade,
  display_name text not null default 'StyleSelf',
  greeting     text not null default 'What are you looking for today?',
  tone         text not null default 'Warm, concise, style-aware',
  currency     text not null default 'USD',
  rules        text,
  enabled      boolean not null default false,
  updated_at   timestamptz not null default now()
);

drop trigger if exists store_agents_updated_at on public.store_agents;
create trigger store_agents_updated_at before update on public.store_agents
  for each row execute function public.set_updated_at();

create table if not exists public.store_locations (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores (id) on delete cascade,
  name       text not null,
  address    text,
  city       text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- On store creation: make the creator owner, seed the agent + a first location.
create or replace function public.handle_new_store()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.store_members (store_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict do nothing;

  insert into public.store_agents (store_id) values (new.id)
  on conflict do nothing;

  insert into public.store_locations (store_id, name, city, is_primary)
  values (new.id, 'Main store', new.headquarters, true);

  return new;
end
$$;

drop trigger if exists on_store_created on public.stores;
create trigger on_store_created after insert on public.stores
  for each row execute function public.handle_new_store();

-- ===========================================================================
-- store_join_requests
-- ===========================================================================
create table if not exists public.store_join_requests (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references public.stores (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  status             public.join_request_status not null default 'pending',
  message            text,
  -- Which branch / address the requester works at (multi-location retailers).
  requester_location text,
  requester_name     text,
  requester_email    text,
  created_at         timestamptz not null default now(),
  decided_at         timestamptz,
  decided_by         uuid references auth.users (id) on delete set null
);

alter table public.store_join_requests
  add column if not exists requester_location text;

alter table public.store_join_requests
  drop constraint if exists store_join_requests_user_id_fkey;
alter table public.store_join_requests
  add constraint store_join_requests_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

create unique index if not exists store_join_requests_pending_uniq
  on public.store_join_requests (store_id, user_id)
  where status = 'pending';

-- Snapshot the requester's identity so managers can review before approving.
create or replace function public.fill_join_request_requester()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select full_name, email
    into new.requester_name, new.requester_email
    from public.profiles where id = new.user_id;
  return new;
end
$$;

drop trigger if exists join_requests_fill_requester on public.store_join_requests;
create trigger join_requests_fill_requester before insert on public.store_join_requests
  for each row execute function public.fill_join_request_requester();

create or replace function public.approve_join_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.store_join_requests;
begin
  select * into r from public.store_join_requests where id = p_request;
  if r.id is null then raise exception 'request not found'; end if;
  if not public.is_store_manager(r.store_id) then
    raise exception 'not authorized';
  end if;

  update public.store_join_requests
     set status = 'approved', decided_at = now(), decided_by = auth.uid()
   where id = p_request;

  insert into public.store_members (store_id, user_id, role)
  values (r.store_id, r.user_id, 'member')
  on conflict do nothing;
end
$$;

create or replace function public.reject_join_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.store_join_requests;
begin
  select * into r from public.store_join_requests where id = p_request;
  if r.id is null then raise exception 'request not found'; end if;
  if not public.is_store_manager(r.store_id) then
    raise exception 'not authorized';
  end if;

  update public.store_join_requests
     set status = 'rejected', decided_at = now(), decided_by = auth.uid()
   where id = p_request;
end
$$;

-- ===========================================================================
-- catalog: products, variants, inventory
-- ===========================================================================
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 200),
  description text,
  -- Merchandising attributes the agent reasons over.
  brand       text,
  style       text,           -- e.g. "Smart casual", "Streetwear"
  gender      text,           -- mens | womens | unisex | kids (free text)
  material    text,           -- e.g. "100% linen"
  care        text,           -- e.g. "Machine wash cold, hang dry"
  category    text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency    text not null default 'USD',
  image_url   text,
  status      public.product_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Idempotent: brings an already-created products table up to date.
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists style text;
alter table public.products add column if not exists gender text;
alter table public.products add column if not exists material text;
alter table public.products add column if not exists care text;
alter table public.products drop column if exists tags;
drop index if exists public.products_tags_gin;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- A variant is one (size, color/pattern) combination of a product. Stock is
-- tracked per variant per location in `inventory`.
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  size        text,
  color       text,           -- colour / pattern
  sku         text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  created_at  timestamptz not null default now()
);

alter table public.product_variants add column if not exists size text;
alter table public.product_variants add column if not exists color text;

-- If an earlier revision used a single `label` column, fold it into `size`
-- before dropping it so existing rows keep their identity.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'label'
  ) then
    update public.product_variants
       set size = label
     where coalesce(size, '') = ''
       and coalesce(color, '') = ''
       and coalesce(label, '') <> '';
  end if;
end
$$;

alter table public.product_variants drop column if exists label;

-- NOT VALID: enforced on new/updated rows without failing on any legacy row.
do $$
begin
  alter table public.product_variants
    add constraint product_variants_has_dimension
    check (coalesce(size, '') <> '' or coalesce(color, '') <> '') not valid;
exception
  when duplicate_object then null;
end
$$;

create unique index if not exists product_variants_combo_uniq
  on public.product_variants (product_id, coalesce(size, ''), coalesce(color, ''));

create table if not exists public.inventory (
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  location_id uuid not null references public.store_locations (id) on delete cascade,
  quantity    integer not null default 0 check (quantity >= 0),
  primary key (variant_id, location_id)
);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.stores              enable row level security;
alter table public.store_members       enable row level security;
alter table public.store_agents        enable row level security;
alter table public.store_locations     enable row level security;
alter table public.store_join_requests enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.inventory           enable row level security;

-- stores: any authenticated user can read (needed to search when joining);
-- only members insert-as-self; managers update; owners delete.
drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores for select to authenticated using (true);

drop policy if exists stores_insert on public.stores;
create policy stores_insert on public.stores for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists stores_update on public.stores;
create policy stores_update on public.stores for update to authenticated
  using (public.is_store_manager(id)) with check (public.is_store_manager(id));

drop policy if exists stores_delete on public.stores;
create policy stores_delete on public.stores for delete to authenticated
  using (public.store_role_is_owner(id));

-- store_members: members see their store's roster; managers remove others.
drop policy if exists store_members_select on public.store_members;
create policy store_members_select on public.store_members for select to authenticated
  using (public.is_store_member(store_id));

drop policy if exists store_members_delete on public.store_members;
create policy store_members_delete on public.store_members for delete to authenticated
  using (public.is_store_manager(store_id) and user_id <> auth.uid());
-- (inserts happen only through SECURITY DEFINER functions/triggers)

-- store_agents: members read, managers write.
drop policy if exists store_agents_select on public.store_agents;
create policy store_agents_select on public.store_agents for select to authenticated
  using (public.is_store_member(store_id));
drop policy if exists store_agents_insert on public.store_agents;
create policy store_agents_insert on public.store_agents for insert to authenticated
  with check (public.is_store_manager(store_id));
drop policy if exists store_agents_write on public.store_agents;
create policy store_agents_write on public.store_agents for update to authenticated
  using (public.is_store_manager(store_id)) with check (public.is_store_manager(store_id));

-- store_locations: members read, managers write.
drop policy if exists store_locations_select on public.store_locations;
create policy store_locations_select on public.store_locations for select to authenticated
  using (public.is_store_member(store_id));
drop policy if exists store_locations_insert on public.store_locations;
create policy store_locations_insert on public.store_locations for insert to authenticated
  with check (public.is_store_manager(store_id));
drop policy if exists store_locations_update on public.store_locations;
create policy store_locations_update on public.store_locations for update to authenticated
  using (public.is_store_manager(store_id)) with check (public.is_store_manager(store_id));
drop policy if exists store_locations_delete on public.store_locations;
create policy store_locations_delete on public.store_locations for delete to authenticated
  using (public.is_store_manager(store_id));

-- store_join_requests: requester manages their own row; managers see + decide
-- for their store (decision writes go through the RPCs above).
drop policy if exists join_requests_select on public.store_join_requests;
create policy join_requests_select on public.store_join_requests for select to authenticated
  using (user_id = auth.uid() or public.is_store_manager(store_id));
drop policy if exists join_requests_insert on public.store_join_requests;
create policy join_requests_insert on public.store_join_requests for insert to authenticated
  with check (user_id = auth.uid() and not public.is_store_member(store_id));
drop policy if exists join_requests_update on public.store_join_requests;
create policy join_requests_update on public.store_join_requests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- products: members read, managers write.
drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated
  using (public.is_store_member(store_id));
drop policy if exists products_write on public.products;
create policy products_write on public.products for all to authenticated
  using (public.is_store_manager(store_id)) with check (public.is_store_manager(store_id));

-- product_variants: inherit access from the parent product.
drop policy if exists variants_select on public.product_variants;
create policy variants_select on public.product_variants for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_store_member(p.store_id)
  ));
drop policy if exists variants_write on public.product_variants;
create policy variants_write on public.product_variants for all to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_store_manager(p.store_id)
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_store_manager(p.store_id)
  ));

-- inventory: inherit access via variant -> product -> store.
drop policy if exists inventory_select on public.inventory;
create policy inventory_select on public.inventory for select to authenticated
  using (exists (
    select 1 from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = variant_id and public.is_store_member(p.store_id)
  ));
drop policy if exists inventory_write on public.inventory;
create policy inventory_write on public.inventory for all to authenticated
  using (exists (
    select 1 from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = variant_id and public.is_store_manager(p.store_id)
  ))
  with check (exists (
    select 1 from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = variant_id and public.is_store_manager(p.store_id)
  ));

-- ===========================================================================
-- Grants
-- ===========================================================================
revoke all on function public.approve_join_request(uuid) from public, anon;
revoke all on function public.reject_join_request(uuid)  from public, anon;
grant execute on function public.approve_join_request(uuid) to authenticated;
grant execute on function public.reject_join_request(uuid)  to authenticated;
