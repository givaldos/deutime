-- Keep the authenticated account name consistent with an optional player identity.
create or replace function public.update_my_account_profile(
  requested_display_name text
)
returns text
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_display_name text := trim(requested_display_name);
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if normalized_display_name is null
    or char_length(normalized_display_name) not between 2 and 100
  then
    raise exception 'Invalid account profile' using errcode = '22023';
  end if;

  update public.profiles
  set display_name = normalized_display_name
  where user_id = current_user_id;

  if not found then
    raise exception 'Account profile required' using errcode = '42501';
  end if;

  -- A person can administer teams and also own a player profile. Keep the
  -- shared name coherent without changing their sport-specific preferred name.
  update public.player_profiles
  set display_name = normalized_display_name
  where user_id = current_user_id;

  update public.athletes
  set full_name = normalized_display_name
  where user_id = current_user_id;

  return normalized_display_name;
end;
$$;

revoke all on function public.update_my_account_profile(text) from public, anon;
grant execute on function public.update_my_account_profile(text) to authenticated;

comment on function public.update_my_account_profile(text) is
  'Updates the current authenticated account name and any linked player identity atomically.';
