-- Store identity/settings belong exclusively to the owner of that store.
-- This is enforced in PostgreSQL so a client cannot update another store by
-- submitting a different store id.

drop policy if exists stores_update on public.stores;
create policy stores_update on public.stores for update to authenticated
  using (public.store_role_is_owner(id))
  with check (public.store_role_is_owner(id));
