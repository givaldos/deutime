-- Stable public event identity and a minimal anonymous projection.
-- The legacy public schedule remains unchanged until its app consumer migrates.

alter table public.events
  add column public_id uuid;

update public.events
set public_id = extensions.gen_random_uuid()
where public_id is null;

alter table public.events
  alter column public_id set default extensions.gen_random_uuid(),
  alter column public_id set not null;

alter table public.events
  add constraint events_public_id_key unique (public_id);

create trigger events_public_id_immutable
  before update on public.events
  for each row execute function private.prevent_column_changes('public_id');

create view public.public_event_directory
with (security_barrier = true)
as
select
  e.public_id,
  t.name as team_name,
  t.timezone as team_timezone,
  e.title,
  e.kind,
  e.sport_format,
  e.starts_at,
  e.ends_at,
  e.opponent_name,
  e.status
from public.events e
join public.teams t on t.id = e.team_id
join public.team_feature_flags flag
  on flag.team_id = e.team_id
  and flag.feature = 'public_event_page'::public.feature_key
  and flag.enabled = true;

revoke all on public.public_event_directory
  from public, anon, authenticated;
grant select on public.public_event_directory
  to anon, authenticated;

comment on column public.events.public_id is
  'Stable non-secret identifier used by the canonical /e/{public_id} URL.';
comment on view public.public_event_directory is
  'Flag-gated anonymous event projection without tenant ids, venue, attendance or athlete data.';
