-- StyleSelf — ensure variant attributes exist on existing databases
--
-- Variant creation sends size and color. Keep this separate so databases
-- that already applied the catalog migration are updated too.

alter table public.product_variants add column if not exists size text;
alter table public.product_variants add column if not exists color text;

-- Older databases used a required `label` column. The current application
-- derives the label from size and color, so it must no longer be required.
alter table public.product_variants drop column if exists label;
