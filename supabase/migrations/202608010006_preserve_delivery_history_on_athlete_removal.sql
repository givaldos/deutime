-- A remoção do vínculo esportivo invalida efeitos futuros, mas não apaga o
-- histórico auditável de entrega nem resultados externos já iniciados.

create or replace function public.remove_athlete_from_team(
  requested_athlete_id uuid
)
returns table (
  removal_outcome text,
  removed_photo_path text
)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_athlete public.athletes%rowtype;
  has_sporting_history boolean;
begin
  select a.*
  into target_athlete
  from public.athletes a
  where a.id = requested_athlete_id
  for update;

  if target_athlete.id is null
    or current_user_id is null
    or not private.is_team_staff(
      target_athlete.team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Team owner or admin access required' using errcode = '42501';
  end if;

  if target_athlete.removed_at is not null then
    raise exception 'Athlete relationship is already removed' using errcode = '55000';
  end if;

  select
    exists (
      select 1
      from public.match_incidents incident
      where incident.athlete_id = target_athlete.id
        or incident.assist_athlete_id = target_athlete.id
    )
    or exists (
      select 1
      from public.event_attendance attendance
      join public.events event on event.id = attendance.event_id
      where attendance.athlete_id = target_athlete.id
        and attendance.status <> 'pending'
        and (event.starts_at <= now() or event.status = 'completed')
    )
    or exists (
      select 1
      from public.lineup_spots spot
      join public.events event on event.id = spot.event_id
      where spot.athlete_id = target_athlete.id
        and (event.starts_at <= now() or event.status = 'completed')
    )
    or exists (
      select 1
      from public.notification_outbox outbox
      where outbox.athlete_id = target_athlete.id
        and outbox.team_id = target_athlete.team_id
    )
  into has_sporting_history;

  insert into public.audit_logs (
    team_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_athlete.team_id,
    current_user_id,
    'athletes.relationship_removed',
    'athletes',
    target_athlete.id::text,
    jsonb_build_object(
      'outcome', case when has_sporting_history then 'archived' else 'deleted' end,
      'had_user_link', target_athlete.user_id is not null,
      'registration_number', target_athlete.registration_number
    )
  );

  if has_sporting_history then
    -- Serializa a remoção com claims/preparos concorrentes. Quem já cruzou a
    -- barreira é preservado; todo efeito ainda seguro é cancelado.
    perform 1
    from public.notification_outbox outbox
    where outbox.athlete_id = target_athlete.id
      and outbox.team_id = target_athlete.team_id
    for update;

    update public.notification_outbox outbox
    set
      status = 'cancelled',
      lease_token = null,
      lease_expires_at = null,
      failure_class = null,
      requires_review = false,
      processed_at = now(),
      last_error = 'Vínculo com o time removido antes do efeito externo.'
    where outbox.athlete_id = target_athlete.id
      and outbox.team_id = target_athlete.team_id
      and outbox.effect_started_at is null
      and outbox.status in ('pending', 'failed', 'processing');

    delete from public.lineup_spots spot
    using public.events event
    where spot.event_id = event.id
      and spot.athlete_id = target_athlete.id
      and event.status = 'scheduled'
      and event.starts_at > now();

    delete from public.event_attendance attendance
    using public.events event
    where attendance.event_id = event.id
      and attendance.athlete_id = target_athlete.id
      and event.status = 'scheduled'
      and event.starts_at > now();

    delete from public.communication_consents
    where athlete_id = target_athlete.id;

    delete from public.athlete_position_preferences
    where athlete_id = target_athlete.id;

    delete from public.athlete_private
    where athlete_id = target_athlete.id;

    update public.athletes
    set
      user_id = null,
      status = 'inactive',
      public_profile = false,
      photo_path = null,
      removed_at = now(),
      removed_by = current_user_id
    where id = target_athlete.id;

    return query select 'archived'::text, target_athlete.photo_path;
  else
    delete from public.athletes
    where id = target_athlete.id;

    return query select 'deleted'::text, target_athlete.photo_path;
  end if;
end;
$$;

comment on function public.remove_athlete_from_team(uuid) is
  'Remove ou arquiva um vínculo, cancela efeitos ainda seguros e preserva histórico de entrega.';
