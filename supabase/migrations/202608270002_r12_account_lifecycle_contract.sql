-- R12 / WP-R12-03 — autonomia de vínculos e encerramento em duas fases.
-- A expansão nasce desligada. Leituras são próprias; mutações exigem o
-- controle explícito e ações destrutivas consomem uma reautenticação curta.

insert into public.runtime_controls (control, enabled)
values ('account_autonomy', false)
on conflict (control) do nothing;

alter table public.teams
  add column closed_at timestamptz,
  add column closure_request_id uuid;

create unique index teams_closure_request_idx
  on public.teams (closure_request_id)
  where closure_request_id is not null;

create table public.account_closure_requests (
  request_id uuid primary key,
  user_id uuid not null unique references auth.users(id) on delete restrict,
  status public.account_closure_status not null default 'auth_pending',
  pending_storage_paths text[] not null default '{}',
  retry_count smallint not null default 0 check (retry_count between 0 and 20),
  next_retry_at timestamptz not null default now(),
  last_error_code text check (
    last_error_code is null or last_error_code ~ '^[a-z0-9_.-]{2,80}$'
  ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '180 days'),
  check (
    (status = 'auth_pending' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create table private.lifecycle_authorizations (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose public.lifecycle_authorization_purpose not null,
  team_id uuid references public.teams(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (purpose = 'close_team' and team_id is not null)
    or (purpose = 'close_account' and team_id is null)
  )
);

create table private.account_exclusion_registry (
  user_id uuid primary key references auth.users(id) on delete restrict,
  request_id uuid not null unique references public.account_closure_requests(request_id)
    on delete restrict,
  blocked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '180 days')
);

create table private.team_closure_storage_jobs (
  request_id uuid primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  pending_storage_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','completed')),
  retry_count smallint not null default 0 check (retry_count between 0 and 20),
  next_retry_at timestamptz not null default now(),
  last_error_code text check (
    last_error_code is null or last_error_code ~ '^[a-z0-9_.-]{2,80}$'
  ),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '180 days')
);

alter table public.account_closure_requests enable row level security;
alter table private.lifecycle_authorizations enable row level security;
alter table private.account_exclusion_registry enable row level security;
alter table private.team_closure_storage_jobs enable row level security;

revoke all on public.account_closure_requests
  from public, anon, authenticated;
revoke all on private.lifecycle_authorizations, private.account_exclusion_registry
  from public, anon, authenticated;
revoke all on private.team_closure_storage_jobs from public, anon, authenticated;

create policy account_closure_requests_select_self
  on public.account_closure_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.account_closure_requests to authenticated;

create or replace function private.is_account_autonomy_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.enabled
    from public.runtime_controls control
    where control.control = 'account_autonomy'::public.runtime_control_key
  ), false);
$$;

create or replace function public.is_account_autonomy_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and private.is_account_autonomy_enabled();
$$;

create or replace function public.is_my_account_blocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.account_exclusion_registry registry
    where registry.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_team_staff(
  requested_team_id uuid,
  allowed_roles public.team_role[] default array['owner', 'admin', 'manager']::public.team_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id
    where membership.team_id = requested_team_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any (allowed_roles)
      and team.closed_at is null
  );
$$;

create or replace function private.is_team_player(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes athlete
    join public.teams team on team.id = athlete.team_id
    where athlete.team_id = requested_team_id
      and athlete.user_id = (select auth.uid())
      and athlete.status = 'active'
      and athlete.removed_at is null
      and team.closed_at is null
  );
$$;

create or replace function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.status = 'active'
    and (
      tg_op = 'DELETE'
      or new.role <> 'owner'
      or new.status <> 'active'
    )
    and not exists (
      select 1 from public.teams team
      where team.id = old.team_id and team.closed_at is not null
    )
    and not exists (
      select 1
      from public.team_memberships membership
      where membership.team_id = old.team_id
        and membership.user_id <> old.user_id
        and membership.role = 'owner'
        and membership.status = 'active'
    )
  then
    raise exception 'O time precisa manter ao menos um proprietário ativo'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.list_my_account_relationships()
returns table (
  relationship_kind text,
  relationship_id uuid,
  team_id uuid,
  team_name text,
  team_slug text,
  relationship_status text,
  relationship_role text,
  is_last_owner boolean
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  with own_memberships as (
    select
      'membership'::text,
      membership.user_id,
      team.id,
      team.name,
      team.slug::text,
      membership.status::text,
      membership.role::text,
      membership.role = 'owner'
        and membership.status = 'active'
        and not exists (
          select 1
          from public.team_memberships another
          where another.team_id = membership.team_id
            and another.user_id <> membership.user_id
            and another.role = 'owner'
            and another.status = 'active'
        )
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id
    where membership.user_id = (select auth.uid())
      and team.closed_at is null
  ), own_athletes as (
    select
      'athlete'::text,
      athlete.id,
      team.id,
      team.name,
      team.slug::text,
      athlete.status::text,
      null::text,
      false
    from public.athletes athlete
    join public.teams team on team.id = athlete.team_id
    where athlete.user_id = (select auth.uid())
      and athlete.removed_at is null
      and team.closed_at is null
  ), own_invitations as (
    select
      'invitation'::text,
      invitation.id,
      team.id,
      team.name,
      team.slug::text,
      invitation.status::text,
      invitation.role::text,
      false
    from public.team_invitations invitation
    join public.teams team on team.id = invitation.team_id
    where invitation.email = private.current_verified_email()
      and invitation.status = 'pending'
      and invitation.expires_at > now()
      and team.closed_at is null
  )
  select * from own_memberships
  union all select * from own_athletes
  union all select * from own_invitations
  order by 4, 1;
$$;

create or replace function public.list_my_owner_transfer_candidates(
  requested_team_id uuid
)
returns table (user_id uuid, display_name text, membership_role public.team_role)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select membership.user_id, profile.display_name, membership.role
  from public.team_memberships membership
  join public.profiles profile on profile.user_id = membership.user_id
  where membership.team_id = requested_team_id
    and membership.user_id <> (select auth.uid())
    and membership.status = 'active'
    and private.is_team_staff(
      requested_team_id,
      array['owner']::public.team_role[]
    )
  order by profile.display_name, membership.user_id;
$$;

create or replace function private.archive_athlete_relationship(
  requested_athlete_id uuid,
  requested_actor_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.athletes%rowtype;
  has_history boolean;
begin
  select athlete.* into target
  from public.athletes athlete
  where athlete.id = requested_athlete_id
  for update;
  if not found or target.removed_at is not null then return 'absent'; end if;

  select
    exists (select 1 from public.match_incidents incident
      where incident.athlete_id = target.id or incident.assist_athlete_id = target.id)
    or exists (select 1 from public.event_attendance attendance
      join public.events event on event.id = attendance.event_id
      where attendance.athlete_id = target.id
        and attendance.status <> 'pending'
        and (event.starts_at <= now() or event.status = 'completed'))
    or exists (select 1 from public.lineup_spots spot
      join public.events event on event.id = spot.event_id
      where spot.athlete_id = target.id
        and (event.starts_at <= now() or event.status = 'completed'))
  into has_history;

  update public.notification_outbox outbox
  set status = 'cancelled', lease_token = null, lease_expires_at = null,
      failure_class = null, requires_review = false, processed_at = now(),
      recipient = 'removido@invalid', payload = '{}'::jsonb,
      last_error = 'Vínculo encerrado antes do efeito externo.'
  where outbox.athlete_id = target.id
    and outbox.effect_started_at is null
    and outbox.status in ('pending', 'failed', 'processing');

  delete from public.lineup_spots spot using public.events event
  where spot.event_id = event.id and spot.athlete_id = target.id
    and event.status = 'scheduled' and event.starts_at > now();
  delete from public.event_attendance attendance using public.events event
  where attendance.event_id = event.id and attendance.athlete_id = target.id
    and event.status = 'scheduled' and event.starts_at > now();
  delete from public.communication_consents where athlete_id = target.id;
  delete from public.athlete_public_consents where athlete_id = target.id;
  delete from public.athlete_position_preferences where athlete_id = target.id;
  delete from public.athlete_private where athlete_id = target.id;

  if has_history then
    update public.athletes
    set user_id = null, full_name = 'Atleta removido', preferred_name = null,
        shirt_number = null, status = 'inactive', public_profile = false,
        photo_path = null, removed_at = now(), removed_by = requested_actor_id
    where id = target.id;
    return 'archived';
  end if;

  delete from public.athletes where id = target.id;
  return 'deleted';
exception
  when foreign_key_violation then
    update public.athletes
    set user_id = null, full_name = 'Atleta removido', preferred_name = null,
        shirt_number = null, status = 'inactive', public_profile = false,
        photo_path = null, removed_at = now(), removed_by = requested_actor_id
    where id = target.id;
    return 'archived';
end;
$$;

create or replace function public.withdraw_my_team_request(
  requested_athlete_id uuid,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare target public.athletes%rowtype;
begin
  if not private.is_account_autonomy_enabled() then
    raise exception 'Autonomia de conta indisponível' using errcode = '55000';
  end if;
  select athlete.* into target from public.athletes athlete
  where athlete.id = requested_athlete_id
    and athlete.user_id = (select auth.uid())
    and athlete.status = 'pending'
    and athlete.removed_at is null
  for update;
  if not found then raise exception 'Pedido indisponível' using errcode = '42501'; end if;
  delete from public.athletes where id = target.id;
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values(target.team_id,(select auth.uid()),'account_relationship.withdrawn','account_relationship',
    target.id::text,'{"result":"deleted"}'::jsonb,request_id::text);
  return true;
end;
$$;

create or replace function public.decline_my_team_invitation(
  requested_invitation_id uuid,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare target public.team_invitations%rowtype;
begin
  if not private.is_account_autonomy_enabled() then
    raise exception 'Autonomia de conta indisponível' using errcode = '55000';
  end if;
  select invitation.* into target from public.team_invitations invitation
  where invitation.id = requested_invitation_id
    and invitation.email = private.current_verified_email()
    and invitation.status = 'pending'
    and invitation.expires_at > now()
  for update;
  if not found then raise exception 'Convite indisponível' using errcode = '42501'; end if;
  update public.team_invitations set status = 'declined' where id = target.id;
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values(target.team_id,(select auth.uid()),'account_invitation.declined','account_invitation',
    target.id::text,'{"result":"declined"}'::jsonb,request_id::text);
  return true;
end;
$$;

create or replace function public.leave_my_team(
  requested_team_id uuid,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_membership public.team_memberships%rowtype;
  target_athlete_id uuid;
  athlete_outcome text := 'absent';
begin
  if current_user_id is null then raise exception 'Autenticação necessária' using errcode='42501'; end if;
  if not private.is_account_autonomy_enabled() then raise exception 'Autonomia de conta indisponível' using errcode='55000'; end if;
  perform 1 from public.teams team where team.id=requested_team_id and team.closed_at is null for update;
  if not found then raise exception 'Time indisponível' using errcode='42501'; end if;
  select membership.* into target_membership from public.team_memberships membership
  where membership.team_id=requested_team_id and membership.user_id=current_user_id for update;
  if target_membership.role='owner' and target_membership.status='active'
    and not exists(select 1 from public.team_memberships another
      where another.team_id=requested_team_id and another.user_id<>current_user_id
        and another.role='owner' and another.status='active') then
    raise exception 'Transfira a propriedade ou encerre o time antes de sair' using errcode='23514';
  end if;
  select athlete.id into target_athlete_id from public.athletes athlete
  where athlete.team_id=requested_team_id and athlete.user_id=current_user_id
    and athlete.removed_at is null for update;
  if target_membership.team_id is null and target_athlete_id is null then
    raise exception 'Vínculo indisponível' using errcode='42501';
  end if;
  if target_membership.team_id is not null then
    delete from public.team_memberships where team_id=requested_team_id and user_id=current_user_id;
  end if;
  if target_athlete_id is not null then
    athlete_outcome := private.archive_athlete_relationship(target_athlete_id,current_user_id);
  end if;
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values(requested_team_id,current_user_id,'account_relationship.left','account_relationship',
    current_user_id::text,jsonb_build_object('athlete',athlete_outcome),request_id::text);
  return jsonb_build_object('athlete',athlete_outcome);
end;
$$;

create or replace function public.transfer_my_team_ownership(
  requested_team_id uuid,
  requested_next_owner_id uuid,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := (select auth.uid());
begin
  if not private.is_account_autonomy_enabled() then raise exception 'Autonomia de conta indisponível' using errcode='55000'; end if;
  perform 1 from public.teams team where team.id=requested_team_id and team.closed_at is null for update;
  if not found then raise exception 'Time indisponível' using errcode='42501'; end if;
  if not exists(select 1 from public.team_memberships membership
    where membership.team_id=requested_team_id and membership.user_id=current_user_id
      and membership.role='owner' and membership.status='active') then
    raise exception 'Proprietário ativo necessário' using errcode='42501';
  end if;
  if not exists(select 1 from public.team_memberships membership
    where membership.team_id=requested_team_id and membership.user_id=requested_next_owner_id
      and membership.status='active') then
    raise exception 'Escolha um membro ativo' using errcode='22023';
  end if;
  update public.team_memberships set role='owner'
  where team_id=requested_team_id and user_id=requested_next_owner_id;
  update public.team_memberships set role='admin'
  where team_id=requested_team_id and user_id=current_user_id;
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values(requested_team_id,current_user_id,'team_ownership.transferred','team_ownership',
    requested_team_id::text,jsonb_build_object('result','transferred'),request_id::text);
  return true;
end;
$$;

create or replace function public.issue_lifecycle_authorization(
  requested_user_id uuid,
  request_id uuid,
  requested_purpose public.lifecycle_authorization_purpose,
  requested_team_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_user_id is null or request_id is null then
    raise exception 'Autorização inválida' using errcode='22023';
  end if;
  insert into private.lifecycle_authorizations(request_id,user_id,purpose,team_id,expires_at)
  values(request_id,requested_user_id,requested_purpose,requested_team_id,now()+interval '5 minutes')
  on conflict on constraint lifecycle_authorizations_pkey do nothing;
  return true;
end;
$$;

create or replace function private.consume_lifecycle_authorization(
  requested_user_id uuid,
  request_id uuid,
  requested_purpose public.lifecycle_authorization_purpose,
  requested_team_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.lifecycle_authorizations authz
  set consumed_at=now()
  where authz.request_id=$2
    and authz.user_id=requested_user_id
    and authz.purpose=requested_purpose
    and authz.team_id is not distinct from requested_team_id
    and authz.consumed_at is null
    and authz.expires_at>now();
  return found;
end;
$$;

create or replace function public.close_my_team(
  requested_team_id uuid,
  requested_team_name text,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.teams%rowtype;
  item record;
  paths text[] := '{}'::text[];
begin
  if not private.is_account_autonomy_enabled() then raise exception 'Autonomia de conta indisponível' using errcode='55000'; end if;
  select team.* into target from public.teams team where team.id=requested_team_id for update;
  if not found or target.closed_at is not null then raise exception 'Time indisponível' using errcode='42501'; end if;
  if trim(requested_team_name)<>target.name then raise exception 'Confirme o nome exato do time' using errcode='22023'; end if;
  if not exists(select 1 from public.team_memberships membership
    where membership.team_id=target.id and membership.user_id=current_user_id
      and membership.role='owner' and membership.status='active') then
    raise exception 'Proprietário ativo necessário' using errcode='42501';
  end if;
  if not private.consume_lifecycle_authorization(current_user_id,request_id,'close_team',target.id) then
    raise exception 'Confirme sua identidade novamente' using errcode='42501';
  end if;
  select coalesce(array_agg(athlete.photo_path), '{}'::text[]) into paths
  from public.athletes athlete
  where athlete.team_id=target.id and athlete.photo_path is not null;
  update public.teams set is_public=false,closed_at=now(),closure_request_id=request_id where id=target.id;
  insert into private.team_closure_storage_jobs(request_id,team_id,pending_storage_paths)
    values(request_id,target.id,paths);
  update public.team_invitations set status='revoked'
    where team_id=target.id and status='pending';
  update public.team_feature_flags set enabled=false,updated_by=current_user_id
    where team_id=target.id and enabled;
  update public.notification_outbox set status='cancelled',recipient='removido@invalid',payload='{}'::jsonb,
    lease_token=null,lease_expires_at=null,failure_class=null,requires_review=false,
    processed_at=now(),last_error='Time encerrado antes do efeito externo.'
    where team_id=target.id and effect_started_at is null
      and status in ('pending','failed','processing');
  for item in select id from public.athletes where team_id=target.id and removed_at is null loop
    perform private.archive_athlete_relationship(item.id,current_user_id);
  end loop;
  update public.team_memberships set status='suspended' where team_id=target.id;
  insert into public.audit_logs(team_id,actor_id,action,entity_type,entity_id,metadata,request_id)
  values(target.id,current_user_id,'teams.closed','teams',target.id::text,'{"result":"closed"}'::jsonb,request_id::text);
  return true;
end;
$$;

create or replace function public.claim_team_closure_storage(requested_limit integer default 20)
returns table(request_id uuid,team_id uuid,pending_storage_paths text[])
language sql
security definer
set search_path = ''
as $$
  update private.team_closure_storage_jobs job
  set retry_count=least(job.retry_count+1,20),
      next_retry_at=now()+least(interval '6 hours',interval '1 minute' * power(2,job.retry_count))
  where job.request_id in (
    select pending.request_id from private.team_closure_storage_jobs pending
    where pending.status='pending' and pending.next_retry_at<=now()
      and pending.retry_count<20
    order by pending.created_at for update skip locked
    limit greatest(1,least(coalesce(requested_limit,20),100))
  )
  returning job.request_id,job.team_id,job.pending_storage_paths;
$$;

create or replace function public.complete_team_closure_storage(
  requested_request_id uuid,
  requested_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_error_code is null then
    update private.team_closure_storage_jobs set status='completed',completed_at=now(),
      pending_storage_paths='{}',last_error_code=null
    where request_id=requested_request_id and status='pending';
    return found;
  end if;
  update private.team_closure_storage_jobs set last_error_code=left(lower(regexp_replace(
    requested_error_code,'[^a-z0-9_.-]+','_','g')),80)
  where request_id=requested_request_id and status='pending';
  return found;
end;
$$;

create or replace function public.begin_my_account_closure(request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email extensions.citext;
  item record;
  paths text[] := '{}'::text[];
  existing public.account_closure_requests%rowtype;
begin
  if current_user_id is null then raise exception 'Autenticação necessária' using errcode='42501'; end if;
  if not private.is_account_autonomy_enabled() then raise exception 'Autonomia de conta indisponível' using errcode='55000'; end if;
  select closure.* into existing from public.account_closure_requests closure
    where closure.user_id=current_user_id for update;
  if found then return jsonb_build_object('request_id',existing.request_id,'paths',existing.pending_storage_paths,'replayed',true); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text,0));
  if exists(select 1 from public.team_memberships membership
    join public.teams team on team.id=membership.team_id
    where membership.user_id=current_user_id and membership.role='owner'
      and membership.status='active' and team.closed_at is null
      and not exists(select 1 from public.team_memberships another
        where another.team_id=membership.team_id and another.user_id<>current_user_id
          and another.role='owner' and another.status='active')) then
    raise exception 'Resolva os times em que você é o último proprietário' using errcode='23514';
  end if;
  if not private.consume_lifecycle_authorization(current_user_id,request_id,'close_account',null) then
    raise exception 'Confirme sua identidade novamente' using errcode='42501';
  end if;
  select user_row.email into current_email from auth.users user_row where user_row.id=current_user_id;
  select coalesce(array_agg(path), '{}'::text[]) into paths from (
    select profile.photo_path as path from public.player_profiles profile
      where profile.user_id=current_user_id and profile.photo_path is not null
    union
    select athlete.photo_path from public.athletes athlete
      where athlete.user_id=current_user_id and athlete.photo_path is not null
  ) storage_paths;
  insert into public.account_closure_requests(request_id,user_id,pending_storage_paths)
    values(request_id,current_user_id,paths);
  insert into private.account_exclusion_registry(user_id,request_id)
    values(current_user_id,request_id);
  if current_email is not null then
    update public.team_invitations set status='declined'
    where email=current_email and status='pending';
  end if;
  for item in select id from public.athletes where user_id=current_user_id and removed_at is null loop
    perform private.archive_athlete_relationship(item.id,current_user_id);
  end loop;
  delete from public.team_memberships where user_id=current_user_id;
  update public.match_comments set author_user_id=null,author_athlete_id=null,
    author_display_name='Participante removido',body='[conteúdo removido]',
    status='author_deleted',deleted_at=coalesce(deleted_at,now())
    where author_user_id=current_user_id and status='active';
  update public.match_comment_reports set reporter_user_id=null
    where reporter_user_id=current_user_id;
  delete from public.player_profiles where user_id=current_user_id;
  delete from public.player_position_preferences where user_id=current_user_id;
  delete from public.profiles where user_id=current_user_id;
  update public.audit_logs set actor_id=null,metadata=jsonb_build_object('result','redacted')
    where actor_id=current_user_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata,request_id)
  values(null,'account_closure.started','account_closure',request_id::text,
    '{"result":"auth_pending"}'::jsonb,request_id::text);
  return jsonb_build_object('request_id',request_id,'paths',paths,'replayed',false);
end;
$$;

create or replace function public.claim_account_closures(requested_limit integer default 20)
returns table(request_id uuid,user_id uuid,pending_storage_paths text[])
language sql
security definer
set search_path = ''
as $$
  update public.account_closure_requests closure
  set retry_count=least(closure.retry_count+1,20),
      next_retry_at=now()+least(interval '6 hours',interval '1 minute' * power(2,closure.retry_count))
  where closure.request_id in (
    select pending.request_id from public.account_closure_requests pending
    where pending.status='auth_pending' and pending.next_retry_at<=now()
      and pending.retry_count<20
    order by pending.started_at
    for update skip locked
    limit greatest(1,least(coalesce(requested_limit,20),100))
  )
  returning closure.request_id,closure.user_id,closure.pending_storage_paths;
$$;

create or replace function public.complete_account_closure(
  requested_request_id uuid,
  requested_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_error_code is null then
    update public.account_closure_requests set status='completed',completed_at=now(),
      pending_storage_paths='{}',last_error_code=null
    where request_id=requested_request_id and status='auth_pending';
    if found then
      insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata,request_id)
      values(null,'account_closure.completed','account_closure',requested_request_id::text,
        '{"result":"completed"}'::jsonb,requested_request_id::text);
    end if;
    return found;
  end if;
  update public.account_closure_requests set last_error_code=left(lower(regexp_replace(
    requested_error_code,'[^a-z0-9_.-]+','_','g')),80)
  where request_id=requested_request_id and status='auth_pending';
  return found;
end;
$$;

create or replace function public.cleanup_account_lifecycle_retention(requested_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_authorizations integer; deleted_requests integer; deleted_registry integer;
  deleted_team_jobs integer;
begin
  delete from private.lifecycle_authorizations where request_id in (
    select authz.request_id from private.lifecycle_authorizations authz
    where authz.expires_at<now() order by authz.expires_at
    limit greatest(1,least(coalesce(requested_limit,500),1000))
  ); get diagnostics deleted_authorizations=row_count;
  delete from private.account_exclusion_registry registry where registry.user_id in (
    select candidate.user_id from private.account_exclusion_registry candidate
    join public.account_closure_requests closure on closure.request_id=candidate.request_id
    where candidate.expires_at<now() and closure.status='completed'
    limit greatest(1,least(coalesce(requested_limit,500),1000))
  ); get diagnostics deleted_registry=row_count;
  delete from public.account_closure_requests closure where closure.request_id in (
    select candidate.request_id from public.account_closure_requests candidate
    where candidate.expires_at<now() and candidate.status='completed'
    limit greatest(1,least(coalesce(requested_limit,500),1000))
  ); get diagnostics deleted_requests=row_count;
  delete from private.team_closure_storage_jobs job where job.request_id in (
    select candidate.request_id from private.team_closure_storage_jobs candidate
    where candidate.expires_at<now() and candidate.status='completed'
    limit greatest(1,least(coalesce(requested_limit,500),1000))
  ); get diagnostics deleted_team_jobs=row_count;
  return jsonb_build_object('authorizations',deleted_authorizations,'requests',deleted_requests,
    'registry',deleted_registry,'team_jobs',deleted_team_jobs);
end;
$$;

revoke all on function private.is_account_autonomy_enabled() from public;
revoke all on function private.archive_athlete_relationship(uuid,uuid) from public;
revoke all on function private.consume_lifecycle_authorization(uuid,uuid,public.lifecycle_authorization_purpose,uuid) from public;
revoke all on function public.is_account_autonomy_enabled() from public;
revoke all on function public.is_my_account_blocked() from public;
revoke all on function public.list_my_account_relationships() from public;
revoke all on function public.list_my_owner_transfer_candidates(uuid) from public;
revoke all on function public.withdraw_my_team_request(uuid,uuid) from public;
revoke all on function public.decline_my_team_invitation(uuid,uuid) from public;
revoke all on function public.leave_my_team(uuid,uuid) from public;
revoke all on function public.transfer_my_team_ownership(uuid,uuid,uuid) from public;
revoke all on function public.issue_lifecycle_authorization(uuid,uuid,public.lifecycle_authorization_purpose,uuid) from public;
revoke all on function public.close_my_team(uuid,text,uuid) from public;
revoke all on function public.begin_my_account_closure(uuid) from public;
revoke all on function public.claim_team_closure_storage(integer) from public;
revoke all on function public.complete_team_closure_storage(uuid,text) from public;
revoke all on function public.claim_account_closures(integer) from public;
revoke all on function public.complete_account_closure(uuid,text) from public;
revoke all on function public.cleanup_account_lifecycle_retention(integer) from public;

grant execute on function public.is_account_autonomy_enabled(), public.is_my_account_blocked(),
  public.list_my_account_relationships(), public.list_my_owner_transfer_candidates(uuid),
  public.withdraw_my_team_request(uuid,uuid), public.decline_my_team_invitation(uuid,uuid),
  public.leave_my_team(uuid,uuid), public.transfer_my_team_ownership(uuid,uuid,uuid),
  public.close_my_team(uuid,text,uuid), public.begin_my_account_closure(uuid)
  to authenticated;
grant execute on function public.issue_lifecycle_authorization(uuid,uuid,public.lifecycle_authorization_purpose,uuid),
  public.claim_team_closure_storage(integer), public.complete_team_closure_storage(uuid,text),
  public.claim_account_closures(integer), public.complete_account_closure(uuid,text),
  public.cleanup_account_lifecycle_retention(integer)
  to service_role;

comment on table public.account_closure_requests is
  'Estado opaco e idempotente do encerramento; PII operacional é removida antes da etapa Auth.';
comment on function public.begin_my_account_closure(uuid) is
  'Bloqueia a conta e minimiza o domínio após consumir reautenticação curta emitida pelo servidor.';
