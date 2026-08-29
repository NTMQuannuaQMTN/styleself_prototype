-- StyleSelf — approved join requests become brand locations
--
-- A brand remains one `stores` row. A person joining as a branch creates a
-- non-primary `store_locations` row under that brand.

create or replace function public.approve_join_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.store_join_requests;
begin
  select * into r
  from public.store_join_requests
  where id = p_request;

  if r.id is null then
    raise exception 'request not found';
  end if;
  if not public.is_store_manager(r.store_id) then
    raise exception 'not authorized';
  end if;
  if r.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  update public.store_join_requests
  set status = 'approved', decided_at = now(), decided_by = auth.uid()
  where id = p_request;

  -- The requester becomes a member of the existing brand.
  insert into public.store_members (store_id, user_id, role)
  values (r.store_id, r.user_id, 'member')
  on conflict do nothing;

  -- The requested branch is an additional, non-primary location.
  insert into public.store_locations (store_id, name, city, is_primary)
  values (
    r.store_id,
    coalesce(nullif(trim(r.requester_location), ''), 'New branch'),
    null,
    false
  );
end
$$;
