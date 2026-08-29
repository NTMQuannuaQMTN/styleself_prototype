-- Assign joined members to the branch location created from their request.
alter table public.store_members
  add column if not exists location_id uuid references public.store_locations (id) on delete set null;

create or replace function public.approve_join_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.store_join_requests; new_location_id uuid;
begin
  select * into r from public.store_join_requests where id = p_request;
  if r.id is null then raise exception 'request not found'; end if;
  if not public.is_store_manager(r.store_id) then raise exception 'not authorized'; end if;
  if r.status <> 'pending' then raise exception 'request is not pending'; end if;
  insert into public.store_locations (store_id, name, is_primary)
  values (r.store_id, coalesce(nullif(trim(r.requester_location), ''), 'New branch'), false)
  returning id into new_location_id;
  insert into public.store_members (store_id, user_id, location_id, role)
  values (r.store_id, r.user_id, new_location_id, 'member')
  on conflict (store_id, user_id) do update set location_id = excluded.location_id;
  update public.store_join_requests
  set status = 'approved', decided_at = now(), decided_by = auth.uid()
  where id = p_request;
end
$$;

drop policy if exists store_locations_select on public.store_locations;
create policy store_locations_select on public.store_locations for select to authenticated using (
  public.is_store_manager(store_id) or id in (
    select location_id from public.store_members
    where store_id = store_locations.store_id and user_id = auth.uid() and location_id is not null
  )
);

drop policy if exists store_locations_update on public.store_locations;
create policy store_locations_update on public.store_locations for update to authenticated
using (public.is_store_manager(store_id) or id in (
  select location_id from public.store_members
  where store_id = store_locations.store_id and user_id = auth.uid() and location_id is not null
))
with check (public.is_store_manager(store_id) or id in (
  select location_id from public.store_members
  where store_id = store_locations.store_id and user_id = auth.uid() and location_id is not null
));
