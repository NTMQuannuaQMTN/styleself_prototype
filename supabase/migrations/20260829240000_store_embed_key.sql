-- StyleSelf — per-store embed key (opt-in enforcement)
--
-- The public agent iframe loads as /agent/<slug>?k=<embed_key>. The key always
-- exists and is shown in the Deploy snippet, but the backend only rejects a
-- missing / wrong key once the owner turns `embed_key_required` on. It travels
-- in the iframe URL, so it is an embed registration token, not a secret.
--
-- Apply after 20260829230000_variant_color_hex.sql. Idempotent — safe to re-run.

alter table public.stores add column if not exists embed_key text;
alter table public.stores
  add column if not exists embed_key_required boolean not null default false;

update public.stores
  set embed_key = 'se_' || replace(gen_random_uuid()::text, '-', '')
  where embed_key is null;

alter table public.stores alter column embed_key set default
  ('se_' || replace(gen_random_uuid()::text, '-', ''));

do $$
begin
  alter table public.stores alter column embed_key set not null;
exception when others then null;
end
$$;

create unique index if not exists stores_embed_key_key on public.stores (embed_key);

-- Owner-only key rotation (breaks any embed already on a site).
create or replace function public.rotate_embed_key(p_store uuid)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
begin
  if not public.store_role_is_owner(p_store) then
    raise exception 'only the store owner can rotate the embed key';
  end if;
  update public.stores
    set embed_key = 'se_' || replace(gen_random_uuid()::text, '-', '')
    where id = p_store
    returning * into v_store;
  return v_store;
end
$$;

revoke all on function public.rotate_embed_key(uuid) from public, anon;
grant execute on function public.rotate_embed_key(uuid) to authenticated;
