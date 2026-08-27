-- R12 WP-02 — staff-owned athlete identities stay private until the verified
-- player explicitly publishes a versioned profile consent.

create or replace function private.keep_unclaimed_athlete_private()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null then
    new.public_profile := false;
  end if;
  return new;
end;
$$;

drop trigger if exists athletes_keep_unclaimed_private on public.athletes;
create trigger athletes_keep_unclaimed_private
  before insert or update of user_id, public_profile
  on public.athletes
  for each row execute function private.keep_unclaimed_athlete_private();

update public.athletes
set public_profile = false
where user_id is null
  and public_profile = true;

alter table public.athletes
  add constraint athletes_unclaimed_private_check
  check (user_id is not null or public_profile = false) not valid;

alter table public.athletes
  validate constraint athletes_unclaimed_private_check;

create or replace function private.sync_player_profile_public_consents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.athlete_public_consents (
    athlete_id,
    team_id,
    purpose,
    status,
    terms_version,
    evidence,
    granted_at,
    revoked_at,
    updated_by
  )
  select
    athlete.id,
    athlete.team_id,
    'public_player_profile'::public.athlete_public_consent_purpose,
    (case when new.is_public then 'granted' else 'revoked' end)::public.consent_status,
    'public-player-profile-v1',
    'profile_settings:r12',
    case when new.is_public then now() else null end,
    case when new.is_public then null else now() end,
    new.user_id
  from public.athletes athlete
  where athlete.user_id = new.user_id
    and athlete.removed_at is null
  on conflict (athlete_id, purpose) do update set
    status = excluded.status,
    terms_version = excluded.terms_version,
    evidence = excluded.evidence,
    granted_at = excluded.granted_at,
    revoked_at = excluded.revoked_at,
    updated_by = excluded.updated_by,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists player_profiles_sync_public_consents
  on public.player_profiles;
create trigger player_profiles_sync_public_consents
  after insert or update of is_public
  on public.player_profiles
  for each row execute function private.sync_player_profile_public_consents();

create or replace function private.sync_claimed_athlete_profile_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_is_public boolean;
begin
  if new.user_id is null or new.removed_at is not null then
    return new;
  end if;

  select profile.is_public
  into profile_is_public
  from public.player_profiles profile
  where profile.user_id = new.user_id;

  if profile_is_public is null then
    return new;
  end if;

  insert into public.athlete_public_consents (
    athlete_id,
    team_id,
    purpose,
    status,
    terms_version,
    evidence,
    granted_at,
    revoked_at,
    updated_by
  ) values (
    new.id,
    new.team_id,
    'public_player_profile'::public.athlete_public_consent_purpose,
    (case when profile_is_public then 'granted' else 'revoked' end)::public.consent_status,
    'public-player-profile-v1',
    'profile_settings:r12',
    case when profile_is_public then now() else null end,
    case when profile_is_public then null else now() end,
    new.user_id
  )
  on conflict (athlete_id, purpose) do update set
    status = excluded.status,
    terms_version = excluded.terms_version,
    evidence = excluded.evidence,
    granted_at = excluded.granted_at,
    revoked_at = excluded.revoked_at,
    updated_by = excluded.updated_by,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists athletes_sync_claimed_profile_consent
  on public.athletes;
create trigger athletes_sync_claimed_profile_consent
  after insert or update of user_id, removed_at
  on public.athletes
  for each row execute function private.sync_claimed_athlete_profile_consent();

insert into public.athlete_public_consents (
  athlete_id,
  team_id,
  purpose,
  status,
  terms_version,
  evidence,
  granted_at,
  revoked_at,
  updated_by
)
select
  athlete.id,
  athlete.team_id,
  'public_player_profile'::public.athlete_public_consent_purpose,
  'granted'::public.consent_status,
  'legacy-public-profile-v1',
  'legacy_self_profile',
  coalesce(profile.updated_at, profile.created_at, now()),
  null,
  athlete.user_id
from public.athletes athlete
join public.player_profiles profile on profile.user_id = athlete.user_id
where athlete.user_id is not null
  and athlete.removed_at is null
  and profile.is_public = true
on conflict (athlete_id, purpose) do nothing;

create or replace view public.public_player_directory
with (security_barrier = true)
as
select
  profile.handle::text as handle,
  profile.display_name,
  profile.preferred_name,
  profile.bio,
  case
    when profile.photo_path ~ (
      '^' || profile.user_id::text || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
    ) then profile.photo_path
    else null
  end as photo_path,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sport_format', preference.sport_format,
        'code', position.code,
        'label', position.label,
        'priority', preference.priority
      ) order by preference.sport_format, preference.priority
    ) filter (where preference.user_id is not null),
    '[]'::jsonb
  ) as positions
from public.player_profiles profile
left join public.player_position_preferences preference
  on preference.user_id = profile.user_id
left join public.positions position
  on position.sport_format = preference.sport_format
  and position.code = preference.position_code
where profile.is_public = true
  and exists (
    select 1
    from public.athletes athlete
    join public.athlete_public_consents consent
      on consent.athlete_id = athlete.id
      and consent.team_id = athlete.team_id
      and consent.purpose = 'public_player_profile'
      and consent.status = 'granted'
      and consent.revoked_at is null
    where athlete.user_id = profile.user_id
      and athlete.removed_at is null
  )
group by profile.user_id;

create or replace view public.public_athlete_directory
with (security_barrier = true)
as
select
  team.slug::text as team_slug,
  athlete.registration_number,
  coalesce(
    profile.preferred_name,
    profile.display_name,
    athlete.preferred_name,
    athlete.full_name
  ) as display_name,
  athlete.shirt_number,
  case
    when profile.photo_path ~ (
      '^' || profile.user_id::text || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
    ) then profile.photo_path
    when athlete.photo_path like (team.id::text || '/%') then athlete.photo_path
    else null
  end as photo_path,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sport_format', position.sport_format,
        'code', position.code,
        'label', position.label,
        'priority', preference.priority
      ) order by preference.sport_format, preference.priority
    ) filter (where preference.athlete_id is not null),
    '[]'::jsonb
  ) as positions,
  profile.handle::text as player_handle
from public.teams team
join public.athletes athlete on athlete.team_id = team.id
join public.player_profiles profile on profile.user_id = athlete.user_id
join public.athlete_public_consents consent
  on consent.athlete_id = athlete.id
  and consent.team_id = athlete.team_id
  and consent.purpose = 'public_player_profile'
  and consent.status = 'granted'
  and consent.revoked_at is null
left join public.athlete_position_preferences preference
  on preference.athlete_id = athlete.id
left join public.positions position
  on position.sport_format = preference.sport_format
  and position.code = preference.position_code
where team.is_public = true
  and athlete.status = 'active'
  and athlete.removed_at is null
  and profile.is_public = true
group by team.slug, team.id, athlete.id, profile.user_id;

create or replace function public.get_public_player_statistics(
  requested_handle text
)
returns table (
  matches_played bigint,
  goals bigint,
  assists bigint,
  yellow_cards bigint,
  red_cards bigint
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    (
      select count(distinct report.event_id)
      from public.match_reports report
      join public.events event on event.id = report.event_id
      join public.event_attendance attendance on attendance.event_id = event.id
      join public.athletes athlete
        on athlete.id = attendance.athlete_id
        and athlete.team_id = event.team_id
      where athlete.user_id = profile.user_id
        and private.has_athlete_public_consent(
          athlete.id,
          'public_sports_activity'::public.athlete_public_consent_purpose
        )
        and attendance.status = 'confirmed'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.athlete_id
      where athlete.user_id = profile.user_id
        and private.has_athlete_public_consent(
          athlete.id,
          'public_sports_activity'::public.athlete_public_consent_purpose
        )
        and incident.kind = 'goal'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.assist_athlete_id
      where athlete.user_id = profile.user_id
        and private.has_athlete_public_consent(
          athlete.id,
          'public_sports_activity'::public.athlete_public_consent_purpose
        )
        and incident.kind = 'goal'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.athlete_id
      where athlete.user_id = profile.user_id
        and private.has_athlete_public_consent(
          athlete.id,
          'public_sports_activity'::public.athlete_public_consent_purpose
        )
        and incident.kind = 'yellow_card'
        and report.finalized_at is not null
        and event.status = 'completed'
    ),
    (
      select count(*)
      from public.match_incidents incident
      join public.match_reports report on report.event_id = incident.event_id
      join public.events event on event.id = incident.event_id
      join public.athletes athlete on athlete.id = incident.athlete_id
      where athlete.user_id = profile.user_id
        and private.has_athlete_public_consent(
          athlete.id,
          'public_sports_activity'::public.athlete_public_consent_purpose
        )
        and incident.kind = 'red_card'
        and report.finalized_at is not null
        and event.status = 'completed'
    )
  from public.player_profiles profile
  where profile.handle = lower(trim(requested_handle))::extensions.citext
    and profile.is_public = true
    and exists (
      select 1
      from public.athletes athlete
      join public.athlete_public_consents consent
        on consent.athlete_id = athlete.id
        and consent.team_id = athlete.team_id
        and consent.purpose = 'public_player_profile'
        and consent.status = 'granted'
        and consent.revoked_at is null
      where athlete.user_id = profile.user_id
        and athlete.removed_at is null
    );
$$;

create or replace function public.get_public_recognition_summary(
  requested_handle text
)
returns table (
  catalog_version text,
  kind public.recognition_kind,
  recognition_count bigint
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    'recognition-v1'::text,
    item.kind,
    count(*)::bigint
  from public.player_profiles profile
  cross join lateral private.get_recognition_projection(profile.user_id) item
  join public.athlete_public_consents profile_consent
    on profile_consent.athlete_id = item.athlete_id
    and profile_consent.team_id = item.team_id
    and profile_consent.purpose = 'public_player_profile'::public.athlete_public_consent_purpose
    and profile_consent.status = 'granted'
    and profile_consent.revoked_at is null
  join public.athlete_public_consents recognition_consent
    on recognition_consent.athlete_id = item.athlete_id
    and recognition_consent.team_id = item.team_id
    and recognition_consent.purpose = 'public_recognition_summary_v1'::public.athlete_public_consent_purpose
    and recognition_consent.status = 'granted'
    and recognition_consent.revoked_at is null
  where requested_handle is not null
    and profile.handle = lower(btrim(requested_handle))::extensions.citext
    and profile.is_public
  group by item.kind
  order by item.kind;
$$;

revoke all on function private.keep_unclaimed_athlete_private() from public;
revoke all on function private.sync_player_profile_public_consents() from public;
revoke all on function private.sync_claimed_athlete_profile_consent() from public;

comment on function private.keep_unclaimed_athlete_private() is
  'R12: forces every unclaimed athlete identity to remain private, including legacy administrative writes.';
comment on function private.sync_player_profile_public_consents() is
  'R12: records the verified player profile choice as versioned consent for every claimed team link.';
comment on function private.sync_claimed_athlete_profile_consent() is
  'R12: initializes versioned profile consent when a verified player claims or creates a team link.';
comment on view public.public_athlete_directory is
  'R12: exposes only active claimed athletes with a public profile and current versioned self-consent.';
comment on view public.public_player_directory is
  'R12: exposes only verified player profiles backed by a current versioned self-consent.';
comment on function public.get_public_player_statistics(text) is
  'Returns finalized aggregate statistics only with current profile and sports-activity consents.';
comment on function public.get_public_recognition_summary(text) is
  'R12: exposes positive recognition totals only with current profile and recognition consents.';
