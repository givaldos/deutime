-- Some WhatsApp-first accounts retain their immutable verified player profile
-- after the Auth phone identifier changes. Treat that durable proof as verified.

create or replace function public.create_team_for_current_user(
  team_name text,
  team_slug text,
  sport_format public.sport_format
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
    or normalized_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'
    or sport_format not in ('field', 'society', 'futsal')
  then
    raise exception 'Invalid team data' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if exists (
    select 1
    from public.teams t
    where t.created_by = current_user_id
      and t.created_at > now() - interval '1 minute'
  ) then
    raise exception 'Team creation temporarily limited' using errcode = '54000';
  end if;

  if (
    select count(*)
    from public.teams t
    where t.created_by = current_user_id
  ) >= 20 then
    raise exception 'Team ownership limit reached' using errcode = '54000';
  end if;

  insert into public.teams (
    name,
    slug,
    default_sport_format,
    timezone,
    created_by
  )
  values (
    normalized_name,
    normalized_slug,
    sport_format,
    'America/Sao_Paulo',
    current_user_id
  );

  return normalized_slug;
end;
$$;

revoke all on function public.create_team_for_current_user(
  text,
  text,
  public.sport_format
) from public;
grant execute on function public.create_team_for_current_user(
  text,
  text,
  public.sport_format
) to authenticated;

comment on function public.create_team_for_current_user(
  text,
  text,
  public.sport_format
) is
  'Creates a team for the current email-, Auth-phone-, or immutable player-profile-verified user with serialized anti-abuse limits.';
