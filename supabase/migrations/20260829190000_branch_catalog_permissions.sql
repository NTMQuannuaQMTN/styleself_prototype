-- Branch members can manage products assigned to their own location.
-- Owners/admins retain access to the complete brand catalog.

alter table public.products
  add column if not exists location_id uuid references public.store_locations (id) on delete set null;

create or replace function public.can_edit_product(p_product uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.products p
    where p.id = p_product
      and (
        public.is_store_manager(p.store_id)
        or exists (
          select 1 from public.store_members sm
          where sm.store_id = p.store_id
            and sm.user_id = auth.uid()
            and sm.location_id = p.location_id
            and sm.location_id is not null
        )
      )
  )
$$;

drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated using (
  public.is_store_manager(store_id)
  or exists (
    select 1 from public.store_members sm
    where sm.store_id = products.store_id
      and sm.user_id = auth.uid()
      and sm.location_id = products.location_id
      and sm.location_id is not null
  )
);

drop policy if exists products_write on public.products;
create policy products_write on public.products for all to authenticated
using (public.can_edit_product(id))
with check (
  public.is_store_manager(store_id)
  or exists (
    select 1 from public.store_members sm
    where sm.store_id = products.store_id
      and sm.user_id = auth.uid()
      and sm.location_id = products.location_id
      and sm.location_id is not null
  )
);

drop policy if exists variants_write on public.product_variants;
create policy variants_write on public.product_variants for all to authenticated
using (public.can_edit_product(product_id))
with check (public.can_edit_product(product_id));

drop policy if exists inventory_write on public.inventory;
create policy inventory_write on public.inventory for all to authenticated
using (exists (
  select 1 from public.product_variants v
  where v.id = inventory.variant_id and public.can_edit_product(v.product_id)
))
with check (exists (
  select 1 from public.product_variants v
  where v.id = inventory.variant_id and public.can_edit_product(v.product_id)
));
