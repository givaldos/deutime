-- R16 / WP-R16-03 / ATH-03 — detalhe privado e estreito do atleta.

create index event_attendance_management_athlete_idx
  on public.event_attendance(team_id, athlete_id, event_id);

create or replace function public.get_management_athlete_detail(
  requested_team_id uuid,
  requested_athlete_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  team_sport public.sport_format;
  staff_role public.team_role;
  result jsonb;
begin
  select membership.role, team.default_sport_format
  into staff_role, team_sport
  from public.team_memberships membership
  join public.teams team on team.id = membership.team_id
  where membership.team_id = requested_team_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role = any (
      array['owner', 'admin', 'manager']::public.team_role[]
    )
    and team.closed_at is null;

  if (select auth.uid()) is null or staff_role is null then
    raise exception 'Detalhe do atleta indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'recognizable_roster'::public.feature_key
  ) then
    raise exception 'Elenco reconhecível indisponível' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'id', athlete.id,
    'registration_number', athlete.registration_number,
    'claimed', athlete.user_id is not null,
    'display_name', coalesce(
      profile.preferred_name,
      profile.display_name,
      athlete.preferred_name,
      athlete.full_name
    ),
    'full_name', athlete.full_name,
    'shirt_number', athlete.shirt_number,
    'status', athlete.status,
    'registration_source', athlete.registration_source,
    'joined_on', athlete.joined_on,
    'created_at', athlete.created_at,
    'contact', jsonb_build_object(
      'birth_date', private_data.birth_date,
      'phone_e164', private_data.phone_e164,
      'email', private_data.email,
      'notes', private_data.notes
    ),
    'positions', coalesce(position_data.positions, '[]'::jsonb),
    'photo_source', case
      when athlete.user_id is not null
        and profile.photo_path ~ (
          '^' || profile.user_id::text
          || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
        ) then 'player_profile'
      when athlete.user_id is null
        and athlete.photo_path ~ (
          '^' || athlete.team_id::text
          || '/[0-9a-f-]{36}\.(jpg|png|webp)$'
        ) then 'team_registration'
      else null
    end,
    'photo_path', case
      when athlete.user_id is not null
        and profile.photo_path ~ (
          '^' || profile.user_id::text
          || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
        ) then profile.photo_path
      when athlete.user_id is null
        and athlete.photo_path ~ (
          '^' || athlete.team_id::text
          || '/[0-9a-f-]{36}\.(jpg|png|webp)$'
        ) then athlete.photo_path
      else null
    end,
    'recent_participations', coalesce(
      participation_data.participations, '[]'::jsonb
    ),
    'sports_statistics_available', false,
    'allowed_actions', jsonb_build_object(
      'can_review', staff_role in ('owner', 'admin')
        and athlete.status = 'pending',
      'can_edit', staff_role in ('owner', 'admin'),
      'can_remove', staff_role in ('owner', 'admin'),
      'can_change_availability', staff_role in ('owner', 'admin')
        and athlete.status in ('active', 'inactive')
    )
  ) into result
  from public.athletes athlete
  left join public.player_profiles profile on profile.user_id = athlete.user_id
  left join public.athlete_private private_data
    on private_data.athlete_id = athlete.id
    and private_data.team_id = athlete.team_id
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'sport_format', selected.sport_format,
      'code', selected.code,
      'label', selected.label,
      'priority', selected.priority
    ) order by selected.priority, selected.code) as positions
    from (
      select preference.sport_format, position.code, position.label,
        preference.priority
      from public.athlete_position_preferences preference
      join public.positions position
        on position.sport_format = preference.sport_format
        and position.code = preference.position_code
      where athlete.user_id is null
        and preference.athlete_id = athlete.id
        and preference.team_id = athlete.team_id
        and preference.sport_format = team_sport
      union all
      select preference.sport_format, position.code, position.label,
        preference.priority
      from public.player_position_preferences preference
      join public.positions position
        on position.sport_format = preference.sport_format
        and position.code = preference.position_code
      where athlete.user_id is not null
        and preference.user_id = athlete.user_id
        and preference.sport_format = team_sport
    ) selected
  ) position_data on true
  left join lateral (
    select jsonb_agg(to_jsonb(recent) order by recent.starts_at desc)
      as participations
    from (
      select event.id as event_id, event.title, event.kind, event.starts_at,
        event.status, attendance.status as attendance_status,
        exists (
          select 1 from public.lineup_spots lineup
          where lineup.event_id = event.id
            and lineup.team_id = event.team_id
            and lineup.athlete_id = athlete.id
        ) as in_lineup
      from public.event_attendance attendance
      join public.events event
        on event.id = attendance.event_id
        and event.team_id = attendance.team_id
      where attendance.athlete_id = athlete.id
        and attendance.team_id = athlete.team_id
      order by event.starts_at desc, event.id desc
      limit 10
    ) recent
  ) participation_data on true
  where athlete.id = requested_athlete_id
    and athlete.team_id = requested_team_id
    and athlete.removed_at is null;

  if result is null then
    raise exception 'Detalhe do atleta indisponível' using errcode = '42501';
  end if;

  return result;
end;
$$;

revoke all on function public.get_management_athlete_detail(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_management_athlete_detail(uuid, uuid)
  to authenticated;

comment on function public.get_management_athlete_detail(uuid, uuid) is
  'Projeção privada e estreita do atleta para staff ativo do mesmo time. Revalida flag e não cria estatísticas derivadas.';
