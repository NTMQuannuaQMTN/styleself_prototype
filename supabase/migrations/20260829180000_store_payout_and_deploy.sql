-- StyleSelf — store payout destination + owner-only deploy toggle
--
-- Apply after 20260829170000_agent_orders.sql. Idempotent — safe to re-run.

-- ---------------------------------------------------------------------------
-- Payout destination — where a completed order's money settles. Only the last 4
-- digits of the account are stored (payment itself is a simulation).
-- ---------------------------------------------------------------------------
alter table public.stores add column if not exists payout_bank_name text;
alter table public.stores add column if not exists payout_account_name text;
alter table public.stores add column if not exists payout_account_last4 text
  check (payout_account_last4 is null or payout_account_last4 ~ '^\d{4}$');

-- ---------------------------------------------------------------------------
-- Going live exposes the catalogue publicly — restrict it to the store OWNER.
-- (stores_update stays open to managers for name / address / slug edits.)
-- ---------------------------------------------------------------------------
create or replace function public.set_store_live(p_store uuid, p_live boolean)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
begin
  if not public.store_role_is_owner(p_store) then
    raise exception 'only the store owner can change deployment';
  end if;
  update public.stores set agent_live = p_live where id = p_store
    returning * into v_store;
  return v_store;
end
$$;

revoke all on function public.set_store_live(uuid, boolean) from public, anon;
grant execute on function public.set_store_live(uuid, boolean) to authenticated;
