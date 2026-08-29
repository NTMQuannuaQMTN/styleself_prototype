-- Members may update stock only for the location assigned to them.
-- Owners and admins retain inventory access across their store's locations.

drop policy if exists inventory_write on public.inventory;
create policy inventory_write on public.inventory for all to authenticated
using (
  exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = inventory.variant_id
      and public.can_edit_product(p.id)
      and (
        public.is_store_manager(p.store_id)
        or exists (
          select 1
          from public.store_members sm
          where sm.store_id = p.store_id
            and sm.user_id = auth.uid()
            and sm.location_id = inventory.location_id
            and sm.location_id is not null
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = inventory.variant_id
      and public.can_edit_product(p.id)
      and (
        public.is_store_manager(p.store_id)
        or exists (
          select 1
          from public.store_members sm
          where sm.store_id = p.store_id
            and sm.user_id = auth.uid()
            and sm.location_id = inventory.location_id
            and sm.location_id is not null
        )
      )
  )
);
