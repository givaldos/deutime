-- R07 / WP-R07-01 — expansão inerte para divisão manual e publicação versionada.
-- O consumidor permanece atrás de team_division, que continua fail-closed.

create type public.athlete_public_consent_purpose as enum (
  'public_player_profile',
  'public_sports_activity'
);

create type public.event_lineup_command_kind as enum (
  'save_draft',
  'publish',
  'withdraw',
  'link_match'
);

create type public.event_lineup_command_result as (
  request_id uuid,
  event_id uuid,
  revision_id uuid,
  squad_count integer,
  assigned_count integer,
  excluded_count integer,
  replayed boolean
);

create table public.athlete_public_consents (
  athlete_id uuid not null,
  team_id uuid not null,
  purpose public.athlete_public_consent_purpose not null,
  status public.consent_status not null,
  terms_version text not null check (terms_version ~ '^[A-Za-z0-9._-]{1,40}$'),
  evidence text not null check (char_length(evidence) between 2 and 100),
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, purpose),
  foreign key (athlete_id, team_id)
    references public.athletes(id, team_id) on delete cascade,
  check (
    (status = 'granted' and granted_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create table public.event_lineup_exclusions (
  event_id uuid not null,
  team_id uuid not null,
  athlete_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (event_id, athlete_id),
  foreign key (event_id, team_id)
    references public.events(id, team_id) on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes(id, team_id) on delete cascade
);

create table public.event_lineup_revisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_id uuid not null,
  revision integer not null check (revision > 0),
  is_active boolean not null default true,
  published_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  withdrawn_by uuid references auth.users(id) on delete restrict,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, revision),
  unique (id, event_id, team_id),
  foreign key (event_id, team_id)
    references public.events(id, team_id) on delete cascade,
  check (
    (is_active and withdrawn_at is null and withdrawn_by is null)
    or (not is_active and withdrawn_at is not null)
  )
);

create unique index event_lineup_revisions_one_active_idx
  on public.event_lineup_revisions(event_id)
  where is_active;

create table public.event_lineup_revision_squads (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null,
  event_id uuid not null,
  team_id uuid not null,
  source_squad_id uuid references public.event_squads(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null check (sort_order between 1 and 12),
  created_at timestamptz not null default now(),
  unique (revision_id, name),
  unique (revision_id, sort_order),
  unique (id, revision_id, event_id, team_id),
  foreign key (revision_id, event_id, team_id)
    references public.event_lineup_revisions(id, event_id, team_id) on delete cascade
);

create table public.event_lineup_revision_spots (
  revision_id uuid not null,
  revision_squad_id uuid not null,
  event_id uuid not null,
  team_id uuid not null,
  athlete_id uuid not null,
  slot_kind public.lineup_slot_kind not null,
  position_code text,
  sort_order smallint not null check (sort_order > 0),
  created_at timestamptz not null default now(),
  primary key (revision_id, athlete_id),
  foreign key (revision_squad_id, revision_id, event_id, team_id)
    references public.event_lineup_revision_squads(id, revision_id, event_id, team_id)
    on delete cascade,
  foreign key (athlete_id, team_id)
    references public.athletes(id, team_id) on delete restrict
);

create table public.event_lineup_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null,
  request_id uuid not null,
  kind public.event_lineup_command_kind not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (team_id, request_id),
  foreign key (event_id, team_id)
    references public.events(id, team_id) on delete restrict
);

create unique index event_squads_event_name_ci_idx
  on public.event_squads(event_id, lower(name));
create index event_lineup_exclusions_team_event_idx
  on public.event_lineup_exclusions(team_id, event_id);
create index event_lineup_revisions_team_event_idx
  on public.event_lineup_revisions(team_id, event_id, revision desc);

create or replace function private.has_athlete_public_consent(
  requested_athlete_id uuid,
  requested_purpose public.athlete_public_consent_purpose
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athlete_public_consents consent
    where consent.athlete_id = requested_athlete_id
      and consent.purpose = requested_purpose
      and consent.status = 'granted'
      and consent.revoked_at is null
  );
$$;

create or replace function private.validate_lineup_spot_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.athletes athlete
    join public.event_attendance attendance
      on attendance.athlete_id = athlete.id
      and attendance.team_id = athlete.team_id
    where athlete.id = new.athlete_id
      and athlete.team_id = new.team_id
      and athlete.status = 'active'
      and athlete.removed_at is null
      and attendance.event_id = new.event_id
      and attendance.status = 'confirmed'
  ) or exists (
    select 1 from public.event_lineup_exclusions exclusion
    where exclusion.event_id = new.event_id
      and exclusion.athlete_id = new.athlete_id
  ) then
    raise exception 'Atleta inelegível para a divisão do evento'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.validate_lineup_exclusion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.athletes athlete
    join public.event_attendance attendance
      on attendance.athlete_id = athlete.id
      and attendance.team_id = athlete.team_id
    where athlete.id = new.athlete_id
      and athlete.team_id = new.team_id
      and athlete.status = 'active'
      and athlete.removed_at is null
      and attendance.event_id = new.event_id
      and attendance.status = 'confirmed'
  ) or exists (
    select 1 from public.lineup_spots spot
    where spot.event_id = new.event_id
      and spot.athlete_id = new.athlete_id
  ) then
    raise exception 'Exclusão inválida para a divisão do evento'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger lineup_spots_validate_eligibility
  before insert or update of athlete_id, event_id, team_id
  on public.lineup_spots
  for each row execute function private.validate_lineup_spot_eligibility();

create trigger event_lineup_exclusions_validate
  before insert or update on public.event_lineup_exclusions
  for each row execute function private.validate_lineup_exclusion();

create or replace function public.set_public_sports_activity_consent(
  requested_athlete_id uuid,
  requested_granted boolean,
  requested_terms_version text,
  request_id uuid
)
returns public.athlete_public_consents
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_athlete public.athletes%rowtype;
  changed_consent public.athlete_public_consents%rowtype;
begin
  if request_id is null or requested_terms_version is null
    or requested_terms_version !~ '^[A-Za-z0-9._-]{1,40}$'
  then
    raise exception 'Solicitação de consentimento inválida' using errcode = '22023';
  end if;

  select athlete.* into target_athlete
  from public.athletes athlete
  where athlete.id = requested_athlete_id
  for update;

  if current_user_id is null
    or target_athlete.id is null
    or target_athlete.user_id is distinct from current_user_id
    or target_athlete.status <> 'active'
    or target_athlete.removed_at is not null
  then
    raise exception 'Consentimento indisponível' using errcode = '42501';
  end if;

  insert into public.athlete_public_consents (
    athlete_id, team_id, purpose, status, terms_version, evidence,
    granted_at, revoked_at, updated_by
  ) values (
    target_athlete.id,
    target_athlete.team_id,
    'public_sports_activity',
    (case when requested_granted then 'granted' else 'revoked' end)::public.consent_status,
    requested_terms_version,
    'profile_settings:r07',
    case when requested_granted then now() else null end,
    case when requested_granted then null else now() end,
    current_user_id
  )
  on conflict (athlete_id, purpose) do update set
    status = excluded.status,
    terms_version = excluded.terms_version,
    evidence = excluded.evidence,
    granted_at = excluded.granted_at,
    revoked_at = excluded.revoked_at,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into changed_consent;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    target_athlete.team_id,
    current_user_id,
    case when requested_granted then 'privacy.sports_activity.granted'
      else 'privacy.sports_activity.revoked' end,
    'athlete_public_consent',
    target_athlete.id::text,
    jsonb_build_object('purpose', 'public_sports_activity', 'terms_version', requested_terms_version),
    request_id::text
  );

  return changed_consent;
end;
$$;

create or replace function public.save_event_lineup_draft(
  requested_event_id uuid,
  request_id uuid,
  requested_squads jsonb,
  requested_assignments jsonb,
  requested_exclusions uuid[] default array[]::uuid[]
)
returns public.event_lineup_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  existing_command public.event_lineup_commands%rowtype;
  squad_count integer;
  assigned_count integer;
  excluded_count integer;
  command_result public.event_lineup_command_result;
begin
  if request_id is null
    or jsonb_typeof(requested_squads) <> 'array'
    or jsonb_typeof(requested_assignments) <> 'array'
  then
    raise exception 'Rascunho inválido' using errcode = '22023';
  end if;

  select event.* into target_event
  from public.events event where event.id = requested_event_id for update;

  if target_event.id is null or current_user_id is null
    or not private.is_team_staff(target_event.team_id)
  then
    raise exception 'Divisão indisponível' using errcode = '42501';
  end if;

  select command.* into existing_command
  from public.event_lineup_commands command
  where command.team_id = target_event.team_id
    and command.request_id = save_event_lineup_draft.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.event_id <> target_event.id or existing_command.kind <> 'save_draft' then
      raise exception 'Identificador já usado em outro comando' using errcode = '22023';
    end if;
    return (
      request_id, target_event.id, null,
      (existing_command.result ->> 'squad_count')::integer,
      (existing_command.result ->> 'assigned_count')::integer,
      (existing_command.result ->> 'excluded_count')::integer,
      true
    )::public.event_lineup_command_result;
  end if;

  if target_event.status <> 'scheduled'
    or not private.is_team_feature_enabled(target_event.team_id, 'team_division')
  then
    raise exception 'Divisão desativada para o evento' using errcode = '55000';
  end if;

  squad_count := jsonb_array_length(requested_squads);
  assigned_count := jsonb_array_length(requested_assignments);
  excluded_count := coalesce(cardinality(requested_exclusions), 0);

  if squad_count not between 2 and 12 or assigned_count > 300 or excluded_count > 300
    or exists (
      select 1 from jsonb_to_recordset(requested_squads)
        as squad(id uuid, name text, color text, sort_order integer)
      where squad.id is null or nullif(btrim(squad.name), '') is null
        or char_length(btrim(squad.name)) > 60
        or btrim(squad.name) ~ '^__r07_'
        or squad.sort_order not between 1 and 12
        or (squad.color is not null and squad.color !~ '^#[0-9A-Fa-f]{6}$')
    )
    or (select count(distinct squad.id) from jsonb_to_recordset(requested_squads)
      as squad(id uuid, name text, color text, sort_order integer)) <> squad_count
    or (select count(distinct lower(btrim(squad.name))) from jsonb_to_recordset(requested_squads)
      as squad(id uuid, name text, color text, sort_order integer)) <> squad_count
    or (select count(distinct squad.sort_order) from jsonb_to_recordset(requested_squads)
      as squad(id uuid, name text, color text, sort_order integer)) <> squad_count
  then
    raise exception 'A divisão deve conter de 2 a 12 times válidos' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(requested_assignments)
      as assignment(athlete_id uuid, squad_id uuid, sort_order integer, position_code text, slot_kind text)
    where assignment.athlete_id is null or assignment.squad_id is null
      or assignment.sort_order not between 1 and 300
      or coalesce(assignment.slot_kind, 'starter') not in ('starter', 'substitute')
      or not exists (
        select 1 from jsonb_to_recordset(requested_squads)
          as squad(id uuid, name text, color text, sort_order integer)
        where squad.id = assignment.squad_id
      )
  ) or (select count(distinct assignment.athlete_id)
    from jsonb_to_recordset(requested_assignments)
      as assignment(athlete_id uuid, squad_id uuid, sort_order integer, position_code text, slot_kind text)
  ) <> assigned_count
  then
    raise exception 'Escalação inválida' using errcode = '22023';
  end if;

  if excluded_count <> (
    select count(distinct athlete_id)::integer from unnest(requested_exclusions) athlete_id
  ) or exists (
    select 1 from unnest(requested_exclusions) excluded(athlete_id)
    join jsonb_to_recordset(requested_assignments)
      as assignment(athlete_id uuid, squad_id uuid, sort_order integer, position_code text, slot_kind text)
      on assignment.athlete_id = excluded.athlete_id
  ) then
    raise exception 'Exclusões inválidas' using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select assignment.athlete_id, assignment.position_code
      from jsonb_to_recordset(requested_assignments)
        as assignment(athlete_id uuid, squad_id uuid, sort_order integer, position_code text, slot_kind text)
      union all
      select excluded.athlete_id, null::text from unnest(requested_exclusions) excluded(athlete_id)
    ) candidate
    left join public.athletes athlete
      on athlete.id = candidate.athlete_id
      and athlete.team_id = target_event.team_id
      and athlete.status = 'active'
      and athlete.removed_at is null
    left join public.event_attendance attendance
      on attendance.event_id = target_event.id
      and attendance.team_id = target_event.team_id
      and attendance.athlete_id = candidate.athlete_id
      and attendance.status = 'confirmed'
    where athlete.id is null or attendance.athlete_id is null
      or (candidate.position_code is not null and not exists (
        select 1 from public.positions position
        where position.sport_format = target_event.sport_format
          and position.code = candidate.position_code
      ))
  ) or exists (
    select 1
    from jsonb_to_recordset(requested_squads)
      as incoming(id uuid, name text, color text, sort_order integer)
    join public.event_squads existing on existing.id = incoming.id
    where existing.event_id <> target_event.id or existing.team_id <> target_event.team_id
  ) then
    raise exception 'Atleta ou time fora do contrato do evento' using errcode = '23514';
  end if;

  delete from public.lineup_spots where event_id = target_event.id;
  delete from public.event_lineup_exclusions where event_id = target_event.id;

  delete from public.event_squads existing
  where existing.event_id = target_event.id
    and not exists (
      select 1 from jsonb_to_recordset(requested_squads)
        as squad(id uuid, name text, color text, sort_order integer)
      where squad.id = existing.id
    );

  update public.event_squads
  set name = concat('__r07_', id::text), updated_at = now()
  where event_id = target_event.id;

  insert into public.event_squads (
    id, event_id, team_id, sport_format, name, color, sort_order, is_official
  )
  select squad.id, target_event.id, target_event.team_id, target_event.sport_format,
    btrim(squad.name), squad.color, squad.sort_order, false
  from jsonb_to_recordset(requested_squads)
    as squad(id uuid, name text, color text, sort_order integer)
  on conflict (id) do update set
    name = excluded.name, color = excluded.color, sort_order = excluded.sort_order,
    is_official = false, updated_at = now();

  insert into public.lineup_spots (
    squad_id, event_id, team_id, athlete_id, sport_format,
    position_code, slot_kind, sort_order
  )
  select assignment.squad_id, target_event.id, target_event.team_id,
    assignment.athlete_id, target_event.sport_format,
    assignment.position_code,
    coalesce(assignment.slot_kind, 'starter')::public.lineup_slot_kind,
    assignment.sort_order
  from jsonb_to_recordset(requested_assignments)
    as assignment(athlete_id uuid, squad_id uuid, sort_order integer, position_code text, slot_kind text);

  insert into public.event_lineup_exclusions (
    event_id, team_id, athlete_id, created_by
  )
  select target_event.id, target_event.team_id, excluded.athlete_id, current_user_id
  from unnest(requested_exclusions) excluded(athlete_id);

  insert into public.event_lineup_commands (
    team_id, event_id, request_id, kind, actor_id, result
  ) values (
    target_event.team_id, target_event.id, request_id, 'save_draft', current_user_id,
    jsonb_build_object('squad_count', squad_count, 'assigned_count', assigned_count,
      'excluded_count', excluded_count)
  );

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata, request_id
  ) values (
    target_event.team_id, current_user_id, 'lineup.draft.saved', 'event_lineup',
    target_event.id::text,
    jsonb_build_object('squad_count', squad_count, 'assigned_count', assigned_count,
      'excluded_count', excluded_count), request_id::text
  );

  command_result := (request_id, target_event.id, null, squad_count,
    assigned_count, excluded_count, false);
  return command_result;
end;
$$;

create or replace function public.publish_event_lineup(
  requested_event_id uuid,
  request_id uuid
)
returns public.event_lineup_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '8s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  existing_command public.event_lineup_commands%rowtype;
  new_revision_id uuid := gen_random_uuid();
  next_revision integer;
  squad_count integer;
  assigned_count integer;
  excluded_count integer;
begin
  if request_id is null then raise exception 'Identificador obrigatório' using errcode = '22023'; end if;
  select event.* into target_event from public.events event
    where event.id = requested_event_id for update;
  if target_event.id is null or current_user_id is null
    or not private.is_team_staff(target_event.team_id, array['owner','admin']::public.team_role[])
  then raise exception 'Publicação indisponível' using errcode = '42501'; end if;

  select command.* into existing_command from public.event_lineup_commands command
    where command.team_id = target_event.team_id
      and command.request_id = publish_event_lineup.request_id for update;
  if existing_command.id is not null then
    if existing_command.event_id <> target_event.id or existing_command.kind <> 'publish' then
      raise exception 'Identificador já usado em outro comando' using errcode = '22023'; end if;
    return (request_id, target_event.id,
      nullif(existing_command.result ->> 'revision_id','')::uuid,
      (existing_command.result ->> 'squad_count')::integer,
      (existing_command.result ->> 'assigned_count')::integer,
      (existing_command.result ->> 'excluded_count')::integer,
      true)::public.event_lineup_command_result;
  end if;

  if target_event.status <> 'scheduled'
    or not private.is_team_feature_enabled(target_event.team_id, 'team_division')
  then raise exception 'Publicação desativada' using errcode = '55000'; end if;

  select count(*)::integer into squad_count from public.event_squads where event_id = target_event.id;
  select count(*)::integer into assigned_count from public.lineup_spots where event_id = target_event.id;
  select count(*)::integer into excluded_count from public.event_lineup_exclusions where event_id = target_event.id;
  if squad_count not between 2 and 12 or assigned_count = 0
    or exists (
      select 1 from public.event_squads squad
      where squad.event_id = target_event.id
        and not exists (select 1 from public.lineup_spots spot where spot.squad_id = squad.id)
    )
  then raise exception 'Rascunho incompleto para publicação' using errcode = '23514'; end if;

  update public.event_lineup_revisions set is_active = false,
    withdrawn_by = current_user_id, withdrawn_at = now()
  where event_id = target_event.id and is_active;
  select coalesce(max(revision), 0) + 1 into next_revision
    from public.event_lineup_revisions where event_id = target_event.id;
  insert into public.event_lineup_revisions (
    id, event_id, team_id, revision, published_by
  ) values (new_revision_id, target_event.id, target_event.team_id, next_revision, current_user_id);

  insert into public.event_lineup_revision_squads (
    revision_id, event_id, team_id, source_squad_id, name, color, sort_order
  ) select new_revision_id, target_event.id, target_event.team_id,
    squad.id, squad.name, squad.color, squad.sort_order
  from public.event_squads squad where squad.event_id = target_event.id;

  insert into public.event_lineup_revision_spots (
    revision_id, revision_squad_id, event_id, team_id, athlete_id,
    slot_kind, position_code, sort_order
  ) select new_revision_id, revision_squad.id, target_event.id, target_event.team_id,
    spot.athlete_id, spot.slot_kind, spot.position_code, spot.sort_order
  from public.lineup_spots spot
  join public.event_lineup_revision_squads revision_squad
    on revision_squad.revision_id = new_revision_id
    and revision_squad.source_squad_id = spot.squad_id
  where spot.event_id = target_event.id;

  insert into public.event_lineup_commands(team_id,event_id,request_id,kind,actor_id,result)
  values (target_event.team_id,target_event.id,request_id,'publish',current_user_id,
    jsonb_build_object('revision_id',new_revision_id,'squad_count',squad_count,
      'assigned_count',assigned_count,'excluded_count',excluded_count));
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values (target_event.team_id,current_user_id,'lineup.published','event_lineup_revision',
    new_revision_id::text,jsonb_build_object('revision',next_revision,'squad_count',squad_count,
      'assigned_count',assigned_count,'excluded_count',excluded_count),request_id::text);
  return (request_id,target_event.id,new_revision_id,squad_count,assigned_count,
    excluded_count,false)::public.event_lineup_command_result;
end;
$$;

create or replace function public.withdraw_event_lineup_publication(
  requested_event_id uuid,
  request_id uuid
)
returns public.event_lineup_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_event public.events%rowtype;
  active_revision public.event_lineup_revisions%rowtype;
  existing_command public.event_lineup_commands%rowtype;
  squad_count integer; assigned_count integer; excluded_count integer;
begin
  if request_id is null then raise exception 'Identificador obrigatório' using errcode = '22023'; end if;
  select event.* into target_event from public.events event where event.id=requested_event_id for update;
  if target_event.id is null or current_user_id is null
    or not private.is_team_staff(target_event.team_id,array['owner','admin']::public.team_role[])
  then raise exception 'Retirada indisponível' using errcode='42501'; end if;
  select command.* into existing_command from public.event_lineup_commands command
    where command.team_id=target_event.team_id and command.request_id=withdraw_event_lineup_publication.request_id for update;
  if existing_command.id is not null then
    if existing_command.event_id<>target_event.id or existing_command.kind<>'withdraw' then
      raise exception 'Identificador já usado em outro comando' using errcode='22023'; end if;
    return (request_id,target_event.id,nullif(existing_command.result->>'revision_id','')::uuid,
      (existing_command.result->>'squad_count')::integer,(existing_command.result->>'assigned_count')::integer,
      (existing_command.result->>'excluded_count')::integer,true)::public.event_lineup_command_result;
  end if;
  if not private.is_team_feature_enabled(target_event.team_id,'team_division') then
    raise exception 'Retirada desativada' using errcode='55000'; end if;
  select revision.* into active_revision from public.event_lineup_revisions revision
    where revision.event_id=target_event.id and revision.is_active for update;
  if active_revision.id is not null then
    update public.event_lineup_revisions set is_active=false,withdrawn_by=current_user_id,withdrawn_at=now()
      where id=active_revision.id;
  end if;
  select count(*)::integer into squad_count from public.event_squads where event_id=target_event.id;
  select count(*)::integer into assigned_count from public.lineup_spots where event_id=target_event.id;
  select count(*)::integer into excluded_count from public.event_lineup_exclusions where event_id=target_event.id;
  insert into public.event_lineup_commands(team_id,event_id,request_id,kind,actor_id,result)
  values(target_event.team_id,target_event.id,request_id,'withdraw',current_user_id,
    jsonb_build_object('revision_id',active_revision.id,'squad_count',squad_count,
      'assigned_count',assigned_count,'excluded_count',excluded_count));
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values(target_event.team_id,current_user_id,'lineup.withdrawn','event_lineup',target_event.id::text,
    jsonb_build_object('revision_id',active_revision.id),request_id::text);
  return(request_id,target_event.id,active_revision.id,squad_count,assigned_count,
    excluded_count,false)::public.event_lineup_command_result;
end;
$$;

create or replace function public.link_event_lineup_squad_to_match_side(
  requested_match_id uuid,
  requested_side_index integer,
  requested_squad_id uuid,
  request_id uuid
)
returns public.event_lineup_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.event_matches%rowtype;
  existing_command public.event_lineup_commands%rowtype;
begin
  if request_id is null or requested_side_index not between 1 and 2 then
    raise exception 'Vínculo inválido' using errcode='22023'; end if;
  select match.* into target_match from public.event_matches match
    where match.id=requested_match_id for update;
  if target_match.id is null or current_user_id is null
    or not private.is_team_staff(target_match.team_id)
  then raise exception 'Vínculo indisponível' using errcode='42501'; end if;
  select command.* into existing_command from public.event_lineup_commands command
    where command.team_id=target_match.team_id and command.request_id=link_event_lineup_squad_to_match_side.request_id for update;
  if existing_command.id is not null then
    if existing_command.event_id<>target_match.event_id or existing_command.kind<>'link_match' then
      raise exception 'Identificador já usado em outro comando' using errcode='22023'; end if;
    return(request_id,target_match.event_id,null,1,0,0,true)::public.event_lineup_command_result;
  end if;
  if target_match.status in ('finalized','void')
    or not private.is_team_feature_enabled(target_match.team_id,'team_division')
    or not exists(select 1 from public.event_squads squad where squad.id=requested_squad_id
      and squad.event_id=target_match.event_id and squad.team_id=target_match.team_id)
  then raise exception 'Time incompatível com a partida' using errcode='23514'; end if;
  update public.match_sides set squad_id=requested_squad_id
    where match_id=target_match.id and side_index=requested_side_index;
  if not found then raise exception 'Lado da partida inexistente' using errcode='22023'; end if;
  insert into public.event_lineup_commands(team_id,event_id,request_id,kind,actor_id,result)
  values(target_match.team_id,target_match.event_id,request_id,'link_match',current_user_id,
    jsonb_build_object('match_id',target_match.id,'side_index',requested_side_index,'squad_id',requested_squad_id,
      'squad_count',1,'assigned_count',0,'excluded_count',0));
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values(target_match.team_id,current_user_id,'lineup.match.linked','event_match',target_match.id::text,
    jsonb_build_object('side_index',requested_side_index,'squad_id',requested_squad_id),request_id::text);
  return(request_id,target_match.event_id,null,1,0,0,false)::public.event_lineup_command_result;
end;
$$;

alter table public.athlete_public_consents enable row level security;
alter table public.event_lineup_exclusions enable row level security;
alter table public.event_lineup_revisions enable row level security;
alter table public.event_lineup_revision_squads enable row level security;
alter table public.event_lineup_revision_spots enable row level security;
alter table public.event_lineup_commands enable row level security;

create policy athlete_public_consents_select on public.athlete_public_consents
  for select to authenticated using (
    exists(select 1 from public.athletes athlete where athlete.id=athlete_id and athlete.user_id=(select auth.uid()))
    or private.is_team_staff(team_id)
  );
create policy event_lineup_exclusions_select on public.event_lineup_exclusions
  for select to authenticated using (private.can_access_team(team_id));
create policy event_lineup_revisions_select on public.event_lineup_revisions
  for select to authenticated using (private.can_access_team(team_id));
create policy event_lineup_revision_squads_select on public.event_lineup_revision_squads
  for select to authenticated using (private.can_access_team(team_id));
create policy event_lineup_revision_spots_select on public.event_lineup_revision_spots
  for select to authenticated using (private.can_access_team(team_id));

revoke all on public.athlete_public_consents, public.event_lineup_exclusions,
  public.event_lineup_revisions, public.event_lineup_revision_squads,
  public.event_lineup_revision_spots, public.event_lineup_commands
  from public, anon, authenticated;
grant select on public.athlete_public_consents, public.event_lineup_exclusions,
  public.event_lineup_revisions, public.event_lineup_revision_squads,
  public.event_lineup_revision_spots to authenticated;

revoke all on function private.has_athlete_public_consent(uuid,public.athlete_public_consent_purpose)
  from public, anon, authenticated;
revoke all on function public.set_public_sports_activity_consent(uuid,boolean,text,uuid),
  public.save_event_lineup_draft(uuid,uuid,jsonb,jsonb,uuid[]),
  public.publish_event_lineup(uuid,uuid),
  public.withdraw_event_lineup_publication(uuid,uuid),
  public.link_event_lineup_squad_to_match_side(uuid,integer,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.set_public_sports_activity_consent(uuid,boolean,text,uuid),
  public.save_event_lineup_draft(uuid,uuid,jsonb,jsonb,uuid[]),
  public.publish_event_lineup(uuid,uuid),
  public.withdraw_event_lineup_publication(uuid,uuid),
  public.link_event_lineup_squad_to_match_side(uuid,integer,uuid,uuid)
  to authenticated;

comment on table public.event_lineup_revisions is
  'R07: cada publicação cria um snapshot histórico; consentimento é revalidado na leitura pública.';
comment on function public.save_event_lineup_draft(uuid,uuid,jsonb,jsonb,uuid[]) is
  'R07: substitui o rascunho inteiro de forma transacional, idempotente e restrita a confirmados ativos.';
