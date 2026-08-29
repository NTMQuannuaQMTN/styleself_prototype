-- StyleSelf — ensure product attributes exist on existing databases
--
-- The application sends these fields when creating products. This migration
-- is separate so databases that already applied the catalog migration are
-- updated as well.

alter table public.products add column if not exists brand text;
alter table public.products add column if not exists style text;
alter table public.products add column if not exists gender text;
alter table public.products add column if not exists material text;
alter table public.products add column if not exists care text;
alter table public.products add column if not exists category text;
