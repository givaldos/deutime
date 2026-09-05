-- R14 / WP-R14-01 — autorização temporária para criar novos times.
-- A expansão nasce inerte; a ativação é uma operação explícita pós-deploy.

insert into public.runtime_controls (control, enabled)
values ('team_creation_invite_only', false)
on conflict (control) do nothing;

create table public.prelaunch_team_invite_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  code_hash bytea not null unique check (octet_length(code_hash) = 32),
  label text not null check (char_length(label) between 2 and 80),
  max_redemptions integer not null default 1
    check (max_redemptions between 1 and 1000),
  redemption_count integer not null default 0
    check (redemption_count between 0 and max_redemptions),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > created_at)
);

create table public.prelaunch_team_invite_redemptions (
  invite_id uuid not null
    references public.prelaunch_team_invite_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  primary key (invite_id, user_id),
  unique (team_id)
);

alter table public.prelaunch_team_invite_codes enable row level security;
alter table public.prelaunch_team_invite_redemptions enable row level security;

revoke all on public.prelaunch_team_invite_codes
  from public, anon, authenticated;
revoke all on public.prelaunch_team_invite_redemptions
  from public, anon, authenticated;
grant select, insert, update on public.prelaunch_team_invite_codes
  to service_role;
grant select, insert on public.prelaunch_team_invite_redemptions
  to service_role;

create or replace function private.normalize_prelaunch_invite_code(
  requested_code text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when upper(trim(requested_code)) ~
      '^[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$'
    then upper(trim(requested_code))
    else null
  end;
$$;

create or replace function private.hash_prelaunch_invite_code(
  requested_code text
)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select extensions.digest(
    convert_to(private.normalize_prelaunch_invite_code(requested_code), 'UTF8'),
    'sha256'
  );
$$;

create or replace function public.issue_prelaunch_team_invite(
  requested_code text,
  requested_label text,
  requested_max_redemptions integer default 1,
  requested_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  normalized_code text;
  normalized_label text;
  created_invite_id uuid;
begin
  normalized_code := private.normalize_prelaunch_invite_code(requested_code);
  normalized_label := trim(requested_label);

  if normalized_code is null
    or char_length(normalized_label) not between 2 and 80
    or requested_max_redemptions not between 1 and 1000
    or (requested_expires_at is not null and requested_expires_at <= now())
  then
    raise exception 'Invalid prelaunch invitation' using errcode = '22023';
  end if;

  insert into public.prelaunch_team_invite_codes(
    code_hash, label, max_redemptions, expires_at
  ) values (
    private.hash_prelaunch_invite_code(normalized_code),
    normalized_label,
    requested_max_redemptions,
    requested_expires_at
  ) returning id into created_invite_id;

  insert into public.audit_logs(
    team_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    null, null, 'prelaunch_invite.issued', 'prelaunch_team_invite',
    created_invite_id::text,
    jsonb_build_object(
      'label', normalized_label,
      'max_redemptions', requested_max_redemptions,
      'expires_at', requested_expires_at
    )
  );

  return created_invite_id;
end;
$$;

create or replace function public.revoke_prelaunch_team_invite(
  requested_invite_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  changed boolean := false;
begin
  update public.prelaunch_team_invite_codes invite
  set revoked_at = now()
  where invite.id = requested_invite_id
    and invite.revoked_at is null;
  changed := found;

  if changed then
    insert into public.audit_logs(
      team_id, actor_id, action, entity_type, entity_id, metadata
    ) values (
      null, null, 'prelaunch_invite.revoked', 'prelaunch_team_invite',
      requested_invite_id::text, '{}'::jsonb
    );
  end if;

  return changed;
end;
$$;

create or replace function public.get_prelaunch_team_invite_status()
returns table (
  invite_only boolean,
  available_codes bigint,
  redeemed_codes bigint,
  expired_codes bigint,
  revoked_codes bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((
      select control.enabled
      from public.runtime_controls control
      where control.control = 'team_creation_invite_only'
    ), false),
    count(*) filter (
      where invite.revoked_at is null
        and (invite.expires_at is null or invite.expires_at > now())
        and invite.redemption_count < invite.max_redemptions
    ),
    count(*) filter (where invite.redemption_count > 0),
    count(*) filter (
      where invite.expires_at is not null and invite.expires_at <= now()
    ),
    count(*) filter (where invite.revoked_at is not null)
  from public.prelaunch_team_invite_codes invite;
$$;

create or replace function public.is_team_creation_invite_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select control.enabled
    from public.runtime_controls control
    where control.control = 'team_creation_invite_only'
  ), false);
$$;

create or replace function public.create_team_for_current_user(
  team_name text,
  team_slug text,
  sport_format public.sport_format,
  invite_code text
)
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  normalized_name text;
  normalized_slug text;
  current_user_id uuid;
  invite_required boolean;
  selected_invite_id uuid;
  created_team_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null or (
    private.current_verified_email() is null
    and private.current_verified_phone() is null
    and not exists (
      select 1
      from public.player_profiles profile
      where profile.user_id = current_user_id
        and profile.phone_verified_at is not null
    )
  ) then
    raise exception 'Verified authentication required' using errcode = '42501';
  end if;

  normalized_name := trim(team_name);
  normalized_slug := lower(trim(team_slug));

  if char_length(normalized_name) not between 2 and 100
    or char_length(normalized_slug) not between 3 and 48
    or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or sport_format not in ('field', 'society', 'futsal')
  then
    raise exception 'Invalid team data' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  invite_required := public.is_team_creation_invite_required();
  if invite_required then
    select invite.id into selected_invite_id
    from public.prelaunch_team_invite_codes invite
    where invite.code_hash = private.hash_prelaunch_invite_code(invite_code)
      and invite.revoked_at is null
      and (invite.expires_at is null or invite.expires_at > now())
      and invite.redemption_count < invite.max_redemptions
      and not exists (
        select 1
        from public.prelaunch_team_invite_redemptions redemption
        where redemption.invite_id = invite.id
          and redemption.user_id = current_user_id
      )
    for update;

    if selected_invite_id is null then
      raise exception 'Invitation unavailable' using errcode = 'P0001';
    end if;
  end if;

  if exists (
    select 1
    from public.teams team
    where team.created_by = current_user_id
      and team.created_at > now() - interval '1 minute'
  ) then
    raise exception 'Team creation temporarily limited' using errcode = '54000';
  end if;

  if (
    select count(*)
    from public.teams team
    where team.created_by = current_user_id
  ) >= 20 then
    raise exception 'Team ownership limit reached' using errcode = '54000';
  end if;

  insert into public.teams(
    name, slug, default_sport_format, timezone, created_by
  ) values (
    normalized_name, normalized_slug, sport_format,
    'America/Sao_Paulo', current_user_id
  ) returning id into created_team_id;

  if invite_required then
    update public.prelaunch_team_invite_codes invite
    set redemption_count = invite.redemption_count + 1
    where invite.id = selected_invite_id;

    insert into public.prelaunch_team_invite_redemptions(
      invite_id, user_id, team_id
    ) values (
      selected_invite_id, current_user_id, created_team_id
    );

    insert into public.audit_logs(
      team_id, actor_id, action, entity_type, entity_id, metadata
    ) values (
      created_team_id, current_user_id, 'prelaunch_invite.redeemed',
      'prelaunch_team_invite', selected_invite_id::text,
      jsonb_build_object('source', 'team_creation')
    );
  end if;

  return normalized_slug;
end;
$$;

create or replace function public.create_team_for_current_user(
  team_name text,
  team_slug text,
  sport_format public.sport_format
)
returns text
language sql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select public.create_team_for_current_user(
    team_name, team_slug, sport_format, null
  );
$$;

revoke all on function private.normalize_prelaunch_invite_code(text)
  from public, anon, authenticated;
revoke all on function private.hash_prelaunch_invite_code(text)
  from public, anon, authenticated;
revoke all on function public.issue_prelaunch_team_invite(
  text, text, integer, timestamptz
) from public, anon, authenticated;
revoke all on function public.revoke_prelaunch_team_invite(uuid)
  from public, anon, authenticated;
revoke all on function public.get_prelaunch_team_invite_status()
  from public, anon, authenticated;
revoke all on function public.is_team_creation_invite_required()
  from public, anon, authenticated;
revoke all on function public.create_team_for_current_user(
  text, text, public.sport_format, text
) from public, anon, authenticated;
revoke all on function public.create_team_for_current_user(
  text, text, public.sport_format
) from public, anon, authenticated;

grant execute on function public.issue_prelaunch_team_invite(
  text, text, integer, timestamptz
) to service_role;
grant execute on function public.revoke_prelaunch_team_invite(uuid)
  to service_role;
grant execute on function public.get_prelaunch_team_invite_status()
  to service_role;
grant execute on function public.is_team_creation_invite_required()
  to authenticated;
grant execute on function public.create_team_for_current_user(
  text, text, public.sport_format, text
) to authenticated;
grant execute on function public.create_team_for_current_user(
  text, text, public.sport_format
) to authenticated;

comment on table public.prelaunch_team_invite_codes is
  'R14: hashes e estado operacional dos códigos bearer do pré-lançamento.';
comment on table public.prelaunch_team_invite_redemptions is
  'R14: vínculo auditável entre convite, sessão e time criado.';
comment on function public.create_team_for_current_user(
  text, text, public.sport_format, text
) is
  'Cria um time e consome atomicamente um convite quando o pré-lançamento restrito está ativo.';
