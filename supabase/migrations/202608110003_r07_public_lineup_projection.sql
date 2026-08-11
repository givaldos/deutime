-- R07 / WP-R07-03 — projeção pública mínima da revisão ativa.
-- A função nasce inerte: exige as duas flags, publicação ativa e consentimento
-- individual vigente em toda leitura.

create or replace function public.get_public_event_lineup(
  requested_public_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select jsonb_build_object(
    'revision', revision.revision,
    'published_at', revision.published_at,
    'squads', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', revision_squad.name,
          'color', revision_squad.color,
          'sort_order', revision_squad.sort_order,
          'athletes', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'name', coalesce(nullif(athlete.preferred_name, ''), athlete.full_name),
                'sort_order', revision_spot.sort_order
              ) order by revision_spot.sort_order,
                coalesce(nullif(athlete.preferred_name, ''), athlete.full_name)
            )
            from public.event_lineup_revision_spots revision_spot
            join public.athletes athlete
              on athlete.id = revision_spot.athlete_id
              and athlete.team_id = revision_spot.team_id
              and athlete.status = 'active'
              and athlete.removed_at is null
            join public.athlete_public_consents consent
              on consent.athlete_id = athlete.id
              and consent.team_id = athlete.team_id
              and consent.purpose = 'public_sports_activity'
              and consent.status = 'granted'
              and consent.revoked_at is null
            where revision_spot.revision_id = revision.id
              and revision_spot.revision_squad_id = revision_squad.id
          ), '[]'::jsonb)
        ) order by revision_squad.sort_order
      )
      from public.event_lineup_revision_squads revision_squad
      where revision_squad.revision_id = revision.id
    ), '[]'::jsonb)
  )
  from public.events event
  join public.event_lineup_revisions revision
    on revision.event_id = event.id
    and revision.team_id = event.team_id
    and revision.is_active
  where event.public_id = requested_public_id
    and private.is_team_feature_enabled(event.team_id, 'public_event_page')
    and private.is_team_feature_enabled(event.team_id, 'team_division');
$$;

revoke all on function public.get_public_event_lineup(uuid)
  from public, anon, authenticated;
grant execute on function public.get_public_event_lineup(uuid)
  to anon, authenticated;

comment on function public.get_public_event_lineup(uuid) is
  'R07: projeta somente revisão ativa, equipes e nomes esportivos com consentimento vigente; omite IDs e PII.';
