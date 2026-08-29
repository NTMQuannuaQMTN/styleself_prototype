-- StyleSelf — relate team memberships to public profiles
--
-- store_members already references auth.users, but the Team page selects the
-- related public.profiles row. PostgREST needs an explicit foreign key to
-- infer that relationship.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_members'::regclass
      and conname = 'store_members_user_id_profiles_fkey'
  ) then
    alter table public.store_members
      add constraint store_members_user_id_profiles_fkey
      foreign key (user_id)
      references public.profiles (id)
      on delete cascade;
  end if;
end
$$;
