-- StyleSelf — merchant-facing SKU on products
--
-- The catalog CSV import needs a stable key to reconcile a row in the file with
-- a product already in the catalog. `products.id` is an internal UUID the
-- merchant never sees; `product_variants.sku` is per-variant and not unique.
-- So we add a product-level code the merchant owns.
--
-- Idempotent — safe to re-run.

alter table public.products
  add column if not exists merchant_sku text;

comment on column public.products.merchant_sku is
  'Merchant-assigned product code (e.g. "LB-001"). Unique within a store. The
   reconciliation key for CSV catalog import. NULL for products added before
   import or via the manual form without a code.';

-- One code per store. Partial index so any number of products may have no code.
create unique index if not exists products_store_merchant_sku_uniq
  on public.products (store_id, merchant_sku)
  where merchant_sku is not null;

-- RLS is unchanged: products_select / products_write / can_edit_product already
-- gate every row by store + branch. merchant_sku rides along on those policies.
