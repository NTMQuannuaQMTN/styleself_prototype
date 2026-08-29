-- Catalog imports reconcile products by merchant_sku. Store members must be
-- able to read the complete store catalog for that lookup; write permissions
-- remain controlled by products_write and can_edit_product.

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated
  using (public.is_store_member(store_id));
