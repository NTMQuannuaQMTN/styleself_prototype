-- StyleSelf — per-store embed key
--
-- The public agent iframe is loaded as /agent/<slug>?k=<embed_key>. The backend
-- checks the key so a merchant can revoke / rotate an embed and so usage is
-- attributable per store. It travels in the iframe URL, so it is an embed
-- registration token, not a secret.
--
-- Apply after 20260829210000_store_payout_and_deploy.sql. Idempotent.

alter table public.stores add column if not exists embed_key text;

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

-- Owner-only rotation.
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

-- The anon iframe needs to read its own store row (the backend also re-checks the
-- key). stores_select_public already allows agent_live = true; nothing to change.
