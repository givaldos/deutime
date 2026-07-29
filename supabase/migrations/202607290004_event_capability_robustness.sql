create or replace function private.enforce_event_capability_session_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
begin
  update public.event_capability_sessions capability
  set
    revoked_at = coalesce(capability.revoked_at, now()),
    revocation_reason = coalesce(
      capability.revocation_reason,
      'active_session_limit'
    )
  where capability.id in (
    select active_capability.id
    from public.event_capability_sessions active_capability
    where active_capability.credential_id = new.credential_id
      and active_capability.revoked_at is null
      and active_capability.idle_expires_at > now()
      and active_capability.absolute_expires_at > now()
    order by
      active_capability.last_seen_at desc,
      active_capability.created_at desc,
      active_capability.id desc
    offset 7
  );

  delete from public.event_capability_sessions capability
  where capability.id in (
    select historical_capability.id
    from public.event_capability_sessions historical_capability
    where historical_capability.credential_id = new.credential_id
    order by
      historical_capability.created_at desc,
      historical_capability.id desc
    offset 31
  )
    and (
      capability.revoked_at is not null
      or capability.idle_expires_at <= now()
      or capability.absolute_expires_at <= now()
    );

  return new;
end;
$$;

revoke all on function private.enforce_event_capability_session_quota()
  from public, anon, authenticated;

drop trigger if exists enforce_event_capability_session_quota
  on public.event_capability_sessions;
create trigger enforce_event_capability_session_quota
before insert on public.event_capability_sessions
for each row execute function private.enforce_event_capability_session_quota();

with ranked_active as (
  select
    capability.id,
    row_number() over (
      partition by capability.credential_id
      order by
        capability.last_seen_at desc,
        capability.created_at desc,
        capability.id desc
    ) as position
  from public.event_capability_sessions capability
  where capability.revoked_at is null
    and capability.idle_expires_at > now()
    and capability.absolute_expires_at > now()
)
update public.event_capability_sessions capability
set
  revoked_at = now(),
  revocation_reason = 'active_session_limit'
from ranked_active
where ranked_active.id = capability.id
  and ranked_active.position > 8;

with ranked_history as (
  select
    capability.id,
    row_number() over (
      partition by capability.credential_id
      order by capability.created_at desc, capability.id desc
    ) as position
  from public.event_capability_sessions capability
)
delete from public.event_capability_sessions capability
using ranked_history
where ranked_history.id = capability.id
  and ranked_history.position > 32
  and (
    capability.revoked_at is not null
    or capability.idle_expires_at <= now()
    or capability.absolute_expires_at <= now()
  );

comment on function private.enforce_event_capability_session_quota() is
  'Bounds each credential to eight active and 32 recent capability sessions. Supported exchanges already serialize on the credential row.';

