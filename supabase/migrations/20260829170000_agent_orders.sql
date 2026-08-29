-- StyleSelf — agent checkout: orders, order items, and a secure checkout RPC
--
-- The embedded agent lets an anonymous shopper buy through conversation. Orders
-- are written ONLY by the SECURITY DEFINER function `agent_checkout`, which
-- re-validates price and stock from live rows and decrements inventory in the
-- same transaction. `/agent/demo` never touches the database.
--
-- Apply after 20260829130000_stores_and_catalog.sql. Idempotent — safe to re-run.

-- ---------------------------------------------------------------------------
-- Studio configuration the agent reads
-- ---------------------------------------------------------------------------
alter table public.store_agents add column if not exists brand_description text;
alter table public.store_agents add column if not exists category_focus text;
alter table public.store_agents
  add column if not exists require_confirmation boolean not null default true;

-- Only the store OWNER may change the agent configuration (was owner + admin).
drop policy if exists store_agents_insert on public.store_agents;
create policy store_agents_insert on public.store_agents for insert to authenticated
  with check (public.store_role_is_owner(store_id));

drop policy if exists store_agents_write on public.store_agents;
create policy store_agents_write on public.store_agents for update to authenticated
  using (public.store_role_is_owner(store_id))
  with check (public.store_role_is_owner(store_id));

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.agent_orders (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores (id) on delete cascade,
  conversation_id text not null,
  draft_hash      text not null,
  buyer_name      text,
  buyer_email     text,
  currency        text not null default 'USD',
  subtotal_cents  integer not null default 0 check (subtotal_cents >= 0),
  fees_cents      integer not null default 0 check (fees_cents >= 0),
  total_cents     integer not null default 0 check (total_cents >= 0),
  fulfillment     text not null default 'delivery',
  location_id     uuid references public.store_locations (id) on delete set null,
  status          text not null default 'paid',
  visa_auth_code  text,
  created_at      timestamptz not null default now(),
  unique (conversation_id, draft_hash)
);

create table if not exists public.agent_order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.agent_orders (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  variant_id       uuid references public.product_variants (id) on delete set null,
  name             text not null,
  variant_label    text,
  quantity         integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

create index if not exists agent_orders_store_idx on public.agent_orders (store_id, created_at desc);
create index if not exists agent_order_items_order_idx on public.agent_order_items (order_id);

-- ---------------------------------------------------------------------------
-- RLS — no anon access. Store members read their own store's orders;
-- all writes go through agent_checkout() (SECURITY DEFINER).
-- ---------------------------------------------------------------------------
alter table public.agent_orders      enable row level security;
alter table public.agent_order_items enable row level security;

drop policy if exists agent_orders_select on public.agent_orders;
create policy agent_orders_select on public.agent_orders for select to authenticated
  using (public.is_store_member(store_id));

drop policy if exists agent_order_items_select on public.agent_order_items;
create policy agent_order_items_select on public.agent_order_items for select to authenticated
  using (exists (
    select 1 from public.agent_orders o
    where o.id = order_id and public.is_store_member(o.store_id)
  ));

-- ---------------------------------------------------------------------------
-- Checkout RPC — the only writer. Idempotent on (conversation_id, draft_hash).
-- p_store is supplied by the backend from the slug-resolved store, never the client.
-- p_items: jsonb array of { variant_id, quantity }.
-- ---------------------------------------------------------------------------
create or replace function public.agent_checkout(
  p_store        uuid,
  p_conversation text,
  p_draft_hash   text,
  p_buyer_name   text,
  p_buyer_email  text,
  p_fulfillment  text,
  p_location     uuid,
  p_currency     text,
  p_items        jsonb
)
returns public.agent_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.agent_orders;
  v_order    public.agent_orders;
  v_item     jsonb;
  v_variant  public.product_variants;
  v_product  public.products;
  v_qty      integer;
  v_unit     integer;
  v_subtotal integer := 0;
  v_fees     integer := 0;
  v_avail    integer;
  v_loc      uuid := p_location;
begin
  -- idempotency: a repeated pay for the same draft returns the same order
  select * into v_existing from public.agent_orders
    where conversation_id = p_conversation and draft_hash = p_draft_hash;
  if found then
    return v_existing;
  end if;

  if v_loc is null then
    select id into v_loc from public.store_locations
      where store_id = p_store order by is_primary desc, created_at asc limit 1;
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'no items';
  end if;

  -- validate + price + reserve stock
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));

    select pv.* into v_variant
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = (v_item->>'variant_id')::uuid
        and p.store_id = p_store
        and p.status = 'active';
    if not found then
      raise exception 'variant % is not available', v_item->>'variant_id';
    end if;

    select * into v_product from public.products where id = v_variant.product_id;
    v_unit := coalesce(v_variant.price_cents, v_product.price_cents);

    select quantity into v_avail from public.inventory
      where variant_id = v_variant.id and location_id = v_loc
      for update;
    if coalesce(v_avail, 0) < v_qty then
      raise exception 'insufficient stock for %', v_product.name;
    end if;

    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  if p_fulfillment = 'delivery' then
    v_fees := 500;
  end if;

  insert into public.agent_orders (
    store_id, conversation_id, draft_hash, buyer_name, buyer_email, currency,
    subtotal_cents, fees_cents, total_cents, fulfillment, location_id, status, visa_auth_code
  ) values (
    p_store, p_conversation, p_draft_hash, p_buyer_name, p_buyer_email, coalesce(p_currency, 'USD'),
    v_subtotal, v_fees, v_subtotal + v_fees, coalesce(p_fulfillment, 'delivery'), v_loc, 'paid',
    'VISA-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10))
  )
  returning * into v_order;

  -- write line items + decrement inventory
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));

    select pv.* into v_variant from public.product_variants pv where pv.id = (v_item->>'variant_id')::uuid;
    select * into v_product from public.products where id = v_variant.product_id;
    v_unit := coalesce(v_variant.price_cents, v_product.price_cents);

    insert into public.agent_order_items (
      order_id, product_id, variant_id, name, variant_label,
      quantity, unit_price_cents, line_total_cents
    ) values (
      v_order.id, v_product.id, v_variant.id, v_product.name,
      nullif(trim(both ' /' from concat_ws(' / ', nullif(v_variant.size, ''), nullif(v_variant.color, ''))), ''),
      v_qty, v_unit, v_unit * v_qty
    );

    update public.inventory
      set quantity = quantity - v_qty
      where variant_id = v_variant.id and location_id = v_loc;
  end loop;

  return v_order;
end
$$;

revoke all on function public.agent_checkout(uuid, text, text, text, text, text, uuid, text, jsonb) from public;
grant execute on function public.agent_checkout(uuid, text, text, text, text, text, uuid, text, jsonb) to anon, authenticated;
