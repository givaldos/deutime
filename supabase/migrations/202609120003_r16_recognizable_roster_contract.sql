-- R16 / WP-R16-03 / ATH-01 — contrato privado e paginado do elenco.

create index athletes_management_roster_idx
  on public.athletes (
    team_id,
    status,
    private.normalize_management_search(
      coalesce(preferred_name, '') || ' ' || full_name
    ),
    id
  )
  where removed_at is null;

create index athletes_management_search_idx
  on public.athletes using gin (
    team_id extensions.uuid_ops,
    private.normalize_management_search(
      full_name || ' ' || coalesce(preferred_name, '')
    ) extensions.gin_trgm_ops
  )
  where removed_at is null;

create index athlete_positions_management_filter_idx
  on public.athlete_position_preferences(team_id, position_code, athlete_id);

create index player_positions_management_filter_idx
  on public.player_position_preferences(user_id, sport_format, position_code);

create or replace function private.can_read_management_athlete_avatar(
  requested_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.athletes athlete
      join public.teams team on team.id = athlete.team_id
      join public.team_memberships membership
        on membership.team_id = athlete.team_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role = any (
          array['owner', 'admin', 'manager']::public.team_role[]
        )
      left join public.player_profiles profile on profile.user_id = athlete.user_id
      join public.team_feature_flags flag
        on flag.team_id = athlete.team_id
        and flag.feature = 'recognizable_roster'::public.feature_key
        and flag.enabled
      where athlete.removed_at is null
        and team.closed_at is null
        and (
          (
            athlete.user_id is not null
            and profile.photo_path = requested_object_name
            and profile.photo_path ~ (
              '^' || profile.user_id::text
              || '/profile/[0-9a-f-]{36}\.(jpg|png|webp)$'
            )
          )
          or (
            athlete.user_id is null
            and athlete.photo_path = requested_object_name
            and athlete.photo_path ~ (
              '^' || athlete.team_id::text
              || '/[0-9a-f-]{36}\.(jpg|png|webp)$'
            )
          )
        )
    );
$$;

revoke all on function private.can_read_management_athlete_avatar(text)
  from public, anon, authenticated;
grant execute on function private.can_read_management_athlete_avatar(text)
  to authenticated;

alter policy athlete_avatars_select_team
  on storage.objects
  using (
    bucket_id = 'athlete_avatars'
    and private.is_team_staff(
      private.try_uuid((storage.foldername(name))[1])
    )
  );

create policy athlete_avatars_select_management_roster
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'athlete_avatars'
    and private.can_read_management_athlete_avatar(name)
  );

create or replace function public.list_management_athletes(
  requested_team_id uuid,
  requested_status public.athlete_status default 'active',
  requested_search text default null,
  requested_position_code text default null,
  requested_limit integer default 24,
  requested_cursor jsonb default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  normalized_search text;
  normalized_position_code text := nullif(upper(btrim(requested_position_code)), '');
  team_sport public.sport_format;
  staff_role public.team_role;
  cursor_name text;
  cursor_id uuid;
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
    raise exception 'Lista de atletas indisponível' using errcode = '42501';
  end if;

  if not private.is_team_feature_enabled(
    requested_team_id, 'recognizable_roster'::public.feature_key
  ) then
    raise exception 'Elenco reconhecível indisponível' using errcode = 'P0001';
  end if;

  if requested_status is null
    or requested_limit is null
    or requested_limit not between 1 and 50
  then
    raise exception 'Filtros de atletas inválidos' using errcode = '22023';
  end if;

  normalized_search := private.normalize_management_search(requested_search);
  if requested_search is not null
    and char_length(normalized_search) not between 2 and 80
  then
    raise exception 'Busca deve ter entre 2 e 80 caracteres' using errcode = '22023';
  end if;

  if normalized_position_code is not null and not exists (
    select 1
    from public.positions position
    where position.sport_format = team_sport
      and position.code = normalized_position_code
  ) then
    raise exception 'Posição inválida para a modalidade do time'
      using errcode = '22023';
  end if;

  if requested_cursor is not null then
    if jsonb_typeof(requested_cursor) <> 'object'
      or requested_cursor - array['sort_name', 'id'] <> '{}'::jsonb
      or not requested_cursor ?& array['sort_name', 'id']
    then
      raise exception 'Cursor de atletas inválido' using errcode = '22023';
    end if;
    begin
      cursor_name := requested_cursor ->> 'sort_name';
      cursor_id := (requested_cursor ->> 'id')::uuid;
    exception when others then
      raise exception 'Cursor de atletas inválido' using errcode = '22023';
    end;
    if cursor_name is null
      or cursor_name <> private.normalize_management_search(cursor_name)
      or char_length(cursor_name) not between 2 and 120
    then
      raise exception 'Cursor de atletas inválido' using errcode = '22023';
    end if;
  end if;

  with roster as materialized (
    select
      athlete.id,
      athlete.registration_number,
      athlete.user_id is not null as claimed,
      coalesce(
        profile.preferred_name,
        profile.display_name,
        athlete.preferred_name,
        athlete.full_name
      ) as display_name,
      athlete.full_name,
      athlete.shirt_number,
      athlete.status,
      coalesce(position_data.positions, '[]'::jsonb) as positions,
      case
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
      end as photo_source,
      case
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
      end as photo_path,
      jsonb_build_object(
        'can_review', staff_role in ('owner', 'admin') and athlete.status = 'pending',
        'can_edit', staff_role in ('owner', 'admin'),
        'can_remove', staff_role in ('owner', 'admin')
      ) as allowed_actions,
      private.normalize_management_search(coalesce(
        profile.preferred_name,
        profile.display_name,
        athlete.preferred_name,
        athlete.full_name
      )) as sort_name
    from public.athletes athlete
    left join public.player_profiles profile on profile.user_id = athlete.user_id
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
    where athlete.team_id = requested_team_id
      and athlete.removed_at is null
      and athlete.status = requested_status
      and (
        normalized_search = ''
        or private.normalize_management_search(
          coalesce(profile.preferred_name, '') || ' '
          || coalesce(profile.display_name, '') || ' '
          || coalesce(athlete.preferred_name, '') || ' '
          || athlete.full_name
        ) like '%' || private.escape_management_like(normalized_search) || '%'
          escape '\'
      )
      and (
        normalized_position_code is null
        or (
          athlete.user_id is null and exists (
            select 1
            from public.athlete_position_preferences filter_position
            where filter_position.athlete_id = athlete.id
              and filter_position.team_id = athlete.team_id
              and filter_position.sport_format = team_sport
              and filter_position.position_code = normalized_position_code
          )
        )
        or (
          athlete.user_id is not null and exists (
            select 1
            from public.player_position_preferences filter_position
            where filter_position.user_id = athlete.user_id
              and filter_position.sport_format = team_sport
              and filter_position.position_code = normalized_position_code
          )
        )
      )
  ), after_cursor as (
    select *
    from roster athlete
    where requested_cursor is null
      or (athlete.sort_name, athlete.id) > (cursor_name, cursor_id)
  ), numbered as (
    select athlete.*,
      row_number() over (order by athlete.sort_name, athlete.id) as page_number
    from after_cursor athlete
  ), page_plus_one as (
    select * from numbered where page_number <= requested_limit + 1
  ), page_items as (
    select * from page_plus_one where page_number <= requested_limit
  ), page_meta as (
    select count(*) > requested_limit as has_more from page_plus_one
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(
      to_jsonb(item) - array['sort_name', 'page_number']
      order by item.page_number
    ) from page_items item), '[]'::jsonb),
    'filtered_count', (select count(*) from roster),
    'pending_count', (
      select count(*)
      from public.athletes pending
      where pending.team_id = requested_team_id
        and pending.removed_at is null
        and pending.status = 'pending'
    ),
    'next_cursor', case when (select has_more from page_meta) then (
      select jsonb_build_object('sort_name', item.sort_name, 'id', item.id)
      from page_items item order by item.page_number desc limit 1
    ) else null end,
    'effective_filters', jsonb_strip_nulls(jsonb_build_object(
      'status', requested_status,
      'search', nullif(normalized_search, ''),
      'position_code', normalized_position_code,
      'limit', requested_limit
    ))
  ) into result;

  return result;
end;
$$;

revoke all on function public.list_management_athletes(
  uuid, public.athlete_status, text, text, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.list_management_athletes(
  uuid, public.athlete_status, text, text, integer, jsonb
) to authenticated;

comment on function private.can_read_management_athlete_avatar(text) is
  'Autoriza leitura operacional da foto privada somente para staff ativo do mesmo time, com flag ligada, vínculo vigente e caminho canônico exato.';
comment on function public.list_management_athletes(
  uuid, public.athlete_status, text, text, integer, jsonb
) is
  'Read model privado e paginado do elenco reconhecível. Revalida sessão, papel, time e flag; não projeta PII.';
