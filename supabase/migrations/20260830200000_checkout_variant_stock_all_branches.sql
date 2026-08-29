-- Checkout stock is tracked per size/colour variant and may be fulfilled from
-- any branch. Keep the preferred branch first when decrementing, then consume
-- the remaining quantity from other branches.

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
  v_inventory record;
  v_qty      integer;
  v_unit     integer;
  v_subtotal integer := 0;
  v_fees     integer := 0;
  v_avail    integer;
  v_remaining integer;
  v_loc      uuid := p_location;
begin
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

  -- Validate each exact size/colour variant against the sum of all branches.
  -- Lock every inventory row first so concurrent checkouts cannot oversell.
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

    perform 1 from public.inventory
      where variant_id = v_variant.id
      for update;
    select coalesce(sum(quantity), 0) into v_avail
      from public.inventory
      where variant_id = v_variant.id;
    if v_avail < v_qty then
      raise exception 'insufficient stock for %', v_product.name;
    end if;

    v_unit := coalesce(v_variant.price_cents, v_product.price_cents);
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

  -- Store the order against the exact variant and consume stock across branches.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));

    select pv.* into v_variant
      from public.product_variants pv where pv.id = (v_item->>'variant_id')::uuid;
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

    v_remaining := v_qty;
    for v_inventory in
      select location_id, quantity
      from public.inventory
      where variant_id = v_variant.id and quantity > 0
      order by case when location_id = v_loc then 0 else 1 end, location_id
      for update
    loop
      if v_remaining <= 0 then exit; end if;
      update public.inventory
        set quantity = quantity - least(v_inventory.quantity, v_remaining)
        where variant_id = v_variant.id and location_id = v_inventory.location_id;
      v_remaining := v_remaining - least(v_inventory.quantity, v_remaining);
    end loop;
  end loop;

  return v_order;
end
$$;

revoke all on function public.agent_checkout(uuid, text, text, text, text, text, uuid, text, jsonb) from public;
grant execute on function public.agent_checkout(uuid, text, text, text, text, text, uuid, text, jsonb) to anon, authenticated;
