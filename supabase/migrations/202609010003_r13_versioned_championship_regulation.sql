-- R13 / WP-R13-03: regulamento versionado, edição auditável e projeção reproduzível.

create table public.championship_regulation_versions (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null,
  team_id uuid not null,
  version_number smallint not null check (version_number between 1 and 32767),
  win_points smallint not null check (win_points between 0 and 10),
  draw_points smallint not null check (draw_points between 0 and 10),
  loss_points smallint not null check (loss_points between 0 and 10),
  tiebreak_order public.championship_tiebreak_key[] not null,
  published_at timestamptz not null,
  published_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (championship_id, version_number),
  unique (id, championship_id, team_id),
  foreign key (championship_id, team_id)
    references public.championships(id, team_id) on delete cascade,
  check (private.valid_championship_tiebreak_order(tiebreak_order))
);

alter table public.championships
  add column regulation_version_id uuid;

insert into public.championship_regulation_versions (
  championship_id,
  team_id,
  version_number,
  win_points,
  draw_points,
  loss_points,
  tiebreak_order,
  published_at,
  published_by
)
select
  championship.id,
  championship.team_id,
  1,
  championship.win_points,
  championship.draw_points,
  championship.loss_points,
  championship.tiebreak_order,
  championship.published_at,
  championship.published_by
from public.championships championship
where championship.status <> 'draft';

update public.championships championship
set regulation_version_id = version.id
from public.championship_regulation_versions version
where version.championship_id = championship.id
  and version.team_id = championship.team_id
  and version.version_number = 1;

alter table public.championships
  add constraint championships_regulation_version_fk
    foreign key (regulation_version_id, id, team_id)
    references public.championship_regulation_versions(
      id, championship_id, team_id
    ) on delete restrict,
  add constraint championships_regulation_version_state_check check (
    (status = 'draft' and regulation_version_id is null)
    or (status <> 'draft' and regulation_version_id is not null)
  );

create table private.championship_regulation_commands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  championship_id uuid not null,
  request_id uuid not null,
  action text not null check (action in ('update', 'reopen')),
  payload_hash text not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (team_id, request_id),
  foreign key (championship_id, team_id)
    references public.championships(id, team_id) on delete cascade
);

create or replace function private.capture_championship_regulation_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version smallint;
  captured_version_id uuid;
begin
  if old.status <> 'draft' and (
    new.win_points is distinct from old.win_points
    or new.draw_points is distinct from old.draw_points
    or new.loss_points is distinct from old.loss_points
    or new.tiebreak_order is distinct from old.tiebreak_order
  ) then
    raise exception 'Regulamento publicado é imutável' using errcode = '55000';
  end if;

  if old.status = 'draft' and new.status = 'published' then
    select (coalesce(max(version.version_number), 0) + 1)::smallint
    into next_version
    from public.championship_regulation_versions version
    where version.championship_id = new.id
      and version.team_id = new.team_id;

    insert into public.championship_regulation_versions (
      championship_id,
      team_id,
      version_number,
      win_points,
      draw_points,
      loss_points,
      tiebreak_order,
      published_at,
      published_by
    ) values (
      new.id,
      new.team_id,
      next_version,
      new.win_points,
      new.draw_points,
      new.loss_points,
      new.tiebreak_order,
      new.published_at,
      new.published_by
    ) returning id into captured_version_id;

    new.regulation_version_id := captured_version_id;
  elsif new.status = 'draft' then
    new.regulation_version_id := null;
  end if;

  return new;
end;
$$;

create trigger championships_regulation_versioning
  before update of status, win_points, draw_points, loss_points, tiebreak_order
  on public.championships
  for each row execute function private.capture_championship_regulation_version();

create trigger championship_regulation_versions_immutable
  before update on public.championship_regulation_versions
  for each row execute function private.prevent_column_changes(
    'id', 'championship_id', 'team_id', 'version_number', 'win_points',
    'draw_points', 'loss_points', 'tiebreak_order', 'published_at',
    'published_by', 'created_at'
  );

alter table public.championship_regulation_versions enable row level security;

create policy championship_regulation_versions_select_staff
  on public.championship_regulation_versions
  for select to authenticated
  using (private.can_access_team(team_id));

create or replace function public.update_championship_regulation(
  requested_championship_id uuid,
  request_id uuid,
  requested_win_points smallint,
  requested_draw_points smallint,
  requested_loss_points smallint,
  requested_tiebreak_order public.championship_tiebreak_key[]
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
  existing_command private.championship_regulation_commands%rowtype;
  requested_payload_hash text;
begin
  if requested_championship_id is null
    or request_id is null
    or requested_win_points not between 0 and 10
    or requested_draw_points not between 0 and 10
    or requested_loss_points not between 0 and 10
    or not private.valid_championship_tiebreak_order(requested_tiebreak_order)
  then
    raise exception 'Regulamento inválido' using errcode = '22023';
  end if;

  select championship.* into target_championship
  from public.championships championship
  where championship.id = requested_championship_id
  for update;

  if target_championship.id is null
    or current_user_id is null
    or not private.is_team_staff(
      target_championship.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  requested_payload_hash := encode(extensions.digest(
    concat_ws('|',
      requested_championship_id::text,
      requested_win_points::text,
      requested_draw_points::text,
      requested_loss_points::text,
      array_to_string(requested_tiebreak_order, ',')
    ),
    'sha256'
  ), 'hex');

  select command.* into existing_command
  from private.championship_regulation_commands command
  where command.team_id = target_championship.team_id
    and command.request_id = update_championship_regulation.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.action <> 'update'
      or existing_command.championship_id <> target_championship.id
      or existing_command.payload_hash <> requested_payload_hash
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (
      request_id,
      target_championship.id,
      target_championship.id,
      true
    )::public.championship_command_result;
  end if;

  if target_championship.status <> 'draft'
    or not private.is_team_feature_enabled(
      target_championship.team_id,
      'championships'
    )
    or not private.is_team_feature_enabled(
      target_championship.team_id,
      'professional_scheduling'
    )
  then
    raise exception 'Regulamento não pode ser alterado' using errcode = '55000';
  end if;

  update public.championships championship
  set win_points = requested_win_points,
      draw_points = requested_draw_points,
      loss_points = requested_loss_points,
      tiebreak_order = requested_tiebreak_order,
      updated_by = current_user_id
  where championship.id = target_championship.id;

  insert into private.championship_regulation_commands (
    team_id,
    championship_id,
    request_id,
    action,
    payload_hash,
    actor_id,
    result
  ) values (
    target_championship.team_id,
    target_championship.id,
    request_id,
    'update',
    requested_payload_hash,
    current_user_id,
    jsonb_build_object('entity_id', target_championship.id)
  );

  return (
    request_id,
    target_championship.id,
    target_championship.id,
    false
  )::public.championship_command_result;
end;
$$;

create or replace function public.reopen_championship_regulation(
  requested_championship_id uuid,
  request_id uuid
)
returns public.championship_command_result
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_championship public.championships%rowtype;
  existing_command private.championship_regulation_commands%rowtype;
  requested_payload_hash text;
begin
  if requested_championship_id is null or request_id is null then
    raise exception 'Comando inválido' using errcode = '22023';
  end if;

  select championship.* into target_championship
  from public.championships championship
  where championship.id = requested_championship_id
  for update;

  if target_championship.id is null
    or current_user_id is null
    or not private.is_team_staff(
      target_championship.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Campeonato indisponível' using errcode = '42501';
  end if;

  requested_payload_hash := encode(extensions.digest(
    requested_championship_id::text,
    'sha256'
  ), 'hex');

  select command.* into existing_command
  from private.championship_regulation_commands command
  where command.team_id = target_championship.team_id
    and command.request_id = reopen_championship_regulation.request_id
  for update;

  if existing_command.id is not null then
    if existing_command.action <> 'reopen'
      or existing_command.championship_id <> target_championship.id
      or existing_command.payload_hash <> requested_payload_hash
    then
      raise exception 'Request ID já utilizado' using errcode = '22023';
    end if;
    return (
      request_id,
      target_championship.id,
      target_championship.id,
      true
    )::public.championship_command_result;
  end if;

  if target_championship.status not in ('published', 'active')
    or not private.is_team_feature_enabled(
      target_championship.team_id,
      'championships'
    )
    or not private.is_team_feature_enabled(
      target_championship.team_id,
      'professional_scheduling'
    )
    or exists (
      select 1
      from public.championship_fixtures fixture
      left join public.event_matches match on match.id = fixture.match_id
      where fixture.championship_id = target_championship.id
        and fixture.team_id = target_championship.team_id
        and (
          fixture.winner_participant_id is not null
          or fixture.resolution is not null
          or match.status in ('live', 'finalized', 'void')
          or exists (
            select 1 from public.match_events event
            where event.match_id = fixture.match_id
          )
        )
    )
  then
    raise exception 'A história esportiva já começou' using errcode = '55000';
  end if;

  update public.championship_fixtures fixture
  set status = 'draft', updated_by = current_user_id
  where fixture.championship_id = target_championship.id
    and fixture.team_id = target_championship.team_id
    and fixture.status = 'scheduled';

  update public.championships championship
  set status = 'draft',
      public_mode = 'private',
      published_at = null,
      published_by = null,
      updated_by = current_user_id
  where championship.id = target_championship.id;

  insert into private.championship_regulation_commands (
    team_id,
    championship_id,
    request_id,
    action,
    payload_hash,
    actor_id,
    result
  ) values (
    target_championship.team_id,
    target_championship.id,
    request_id,
    'reopen',
    requested_payload_hash,
    current_user_id,
    jsonb_build_object(
      'entity_id', target_championship.id,
      'previous_regulation_version_id', target_championship.regulation_version_id
    )
  );

  return (
    request_id,
    target_championship.id,
    target_championship.id,
    false
  )::public.championship_command_result;
end;
$$;

revoke all on public.championship_regulation_versions
  from public, anon, authenticated;
grant select on public.championship_regulation_versions to authenticated;

revoke all on function private.capture_championship_regulation_version()
  from public, anon, authenticated;
revoke all on function public.update_championship_regulation(
  uuid, uuid, smallint, smallint, smallint,
  public.championship_tiebreak_key[]
) from public, anon, authenticated;
revoke all on function public.reopen_championship_regulation(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.update_championship_regulation(
  uuid, uuid, smallint, smallint, smallint,
  public.championship_tiebreak_key[]
) to authenticated;
grant execute on function public.reopen_championship_regulation(uuid, uuid)
  to authenticated;

comment on table public.championship_regulation_versions is
  'R13: snapshots imutáveis do regulamento capturados em cada publicação.';
comment on function public.update_championship_regulation(
  uuid, uuid, smallint, smallint, smallint,
  public.championship_tiebreak_key[]
) is 'R13: atualiza o regulamento somente no rascunho, com autorização e idempotência.';
comment on function public.reopen_championship_regulation(uuid, uuid) is
  'R13: recolhe e reabre o regulamento antes do primeiro fato esportivo.';
