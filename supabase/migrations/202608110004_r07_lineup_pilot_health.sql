-- R07 / WP-R07-04 — sonda agregada e somente leitura para o piloto.
-- O retorno não contém atleta, nome, evento público, telefone ou segredo.

create or replace function public.get_event_lineup_pilot_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  team_division_enabled boolean,
  public_event_page_enabled boolean,
  scheduled_events bigint,
  draft_events bigint,
  draft_squads bigint,
  draft_assignments bigint,
  draft_exclusions bigint,
  active_revisions bigint,
  published_squads bigint,
  published_assignments bigint,
  consented_published_assignments bigint,
  publications_24h bigint,
  withdrawals_24h bigint,
  last_draft_at timestamptz,
  last_publication_at timestamptz,
  last_withdrawal_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select
    now(),
    coalesce((select flag.enabled from public.team_feature_flags flag
      where flag.team_id = requested_team_id and flag.feature = 'team_division'), false),
    coalesce((select flag.enabled from public.team_feature_flags flag
      where flag.team_id = requested_team_id and flag.feature = 'public_event_page'), false),
    (select count(*) from public.events event
      where event.team_id = requested_team_id and event.status = 'scheduled'
        and event.starts_at > now()),
    (select count(distinct squad.event_id) from public.event_squads squad
      where squad.team_id = requested_team_id),
    (select count(*) from public.event_squads squad
      where squad.team_id = requested_team_id),
    (select count(*) from public.lineup_spots spot
      where spot.team_id = requested_team_id),
    (select count(*) from public.event_lineup_exclusions exclusion
      where exclusion.team_id = requested_team_id),
    (select count(*) from public.event_lineup_revisions revision
      where revision.team_id = requested_team_id and revision.is_active),
    (select count(*) from public.event_lineup_revision_squads squad
      join public.event_lineup_revisions revision on revision.id = squad.revision_id
      where revision.team_id = requested_team_id and revision.is_active),
    (select count(*) from public.event_lineup_revision_spots spot
      join public.event_lineup_revisions revision on revision.id = spot.revision_id
      where revision.team_id = requested_team_id and revision.is_active),
    (select count(*) from public.event_lineup_revision_spots spot
      join public.event_lineup_revisions revision on revision.id = spot.revision_id
      join public.athletes athlete on athlete.id = spot.athlete_id
        and athlete.team_id = spot.team_id
      join public.athlete_public_consents consent on consent.athlete_id = spot.athlete_id
        and consent.team_id = spot.team_id
        and consent.purpose = 'public_sports_activity'
        and consent.status = 'granted'
        and consent.revoked_at is null
      where revision.team_id = requested_team_id and revision.is_active
        and athlete.status = 'active' and athlete.removed_at is null),
    (select count(*) from public.audit_logs audit
      where audit.team_id = requested_team_id and audit.action = 'lineup.published'
        and audit.created_at >= now() - interval '24 hours'),
    (select count(*) from public.audit_logs audit
      where audit.team_id = requested_team_id and audit.action = 'lineup.withdrawn'
        and audit.created_at >= now() - interval '24 hours'),
    (select max(audit.created_at) from public.audit_logs audit
      where audit.team_id = requested_team_id and audit.action = 'lineup.draft.saved'),
    (select max(audit.created_at) from public.audit_logs audit
      where audit.team_id = requested_team_id and audit.action = 'lineup.published'),
    (select max(audit.created_at) from public.audit_logs audit
      where audit.team_id = requested_team_id and audit.action = 'lineup.withdrawn')
  where exists (select 1 from public.teams team where team.id = requested_team_id);
$$;

revoke all on function public.get_event_lineup_pilot_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_event_lineup_pilot_health(uuid)
  to service_role;

comment on function public.get_event_lineup_pilot_health(uuid) is
  'Returns aggregate, PII-free health signals for one R07 lineup pilot team.';
