-- StyleSelf — optional swatch colour for a variant
--
-- Apply after 20260829220000_store_embed_key.sql.
--
-- `product_variants.color` is the shopper-facing colour name ("Oatmeal", "Sky
-- Blue") — the agent matches on it, so it must stay clean text. This adds an
-- OPTIONAL hex code the storefront uses to paint an accurate swatch dot next to
-- that name. When it's null the UI falls back to a name→colour table.
--
-- Idempotent — safe to re-run.

alter table public.product_variants
  add column if not exists color_hex text;

comment on column public.product_variants.color_hex is
  'Optional #RRGGBB for the storefront swatch. The colour NAME stays in
   product_variants.color; this is display-only and never used for matching.';

do $$
begin
  alter table public.product_variants
    add constraint product_variants_color_hex_format
    check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$')
    not valid;
exception
  when duplicate_object then null;
end $$;

-- RLS unchanged: product_variants_select / _write already gate every row by
-- store + branch; color_hex rides along.
