-- R13 / WP-R13-05 — serialização por tenant e sonda operacional sem PII.
-- A capacidade permanece desligada fora da coorte explicitamente autorizada.

create or replace function private.lock_professional_schedule_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_team_id uuid := coalesce(new.team_id, old.team_id);
begin
  if private.is_team_feature_enabled(
    requested_team_id, 'professional_scheduling'
  ) then
    perform pg_advisory_xact_lock(
      hashtextextended(requested_team_id::text, 1305)
    );
  end if;
  return coalesce(new, old);
end;
$$;

create trigger events_lock_professional_schedule_team
  before insert or update of team_id, starts_at, ends_at, venue_id, status,
    professional_schedule_state
  on public.events
  for each row execute function private.lock_professional_schedule_team();

create trigger event_attendance_lock_professional_schedule_team
  before insert or update of team_id, event_id, status or delete
  on public.event_attendance
  for each row execute function private.lock_professional_schedule_team();

revoke all on function private.lock_professional_schedule_team() from public;

create or replace function public.set_professional_scheduling_pilot_state(
  requested_team_id uuid,
  requested_enabled boolean
)
returns public.team_feature_flags
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  changed_flag public.team_feature_flags;
begin
  if not private.is_team_staff(
    requested_team_id,
    array['owner', 'admin']::public.team_role[]
  ) then
    raise exception 'Somente owner ou admin pode alterar o piloto'
      using errcode = '42501';
  end if;

  if requested_enabled and not exists (
    select 1
    from public.team_professional_scheduling_settings settings
    join public.team_squad_presets home_team
      on home_team.id = settings.default_home_team_id
      and home_team.team_id = settings.team_id
      and home_team.is_active
    join public.team_squad_presets away_team
      on away_team.id = settings.default_away_team_id
      and away_team.team_id = settings.team_id
      and away_team.is_active
    where settings.team_id = requested_team_id
      and home_team.id <> away_team.id
  ) then
    raise exception 'Configure duas equipes padrão antes de ativar o piloto'
      using errcode = '55000';
  end if;

  changed_flag := public.set_team_feature_flag(
    requested_team_id,
    'professional_scheduling',
    requested_enabled
  );
  return changed_flag;
end;
$$;

revoke all on function public.set_professional_scheduling_pilot_state(
  uuid,boolean
) from public, anon;
grant execute on function public.set_professional_scheduling_pilot_state(
  uuid,boolean
) to authenticated;

create or replace function public.get_r13_pilot_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  team_open boolean,
  professional_scheduling_enabled boolean,
  whatsapp_delivery_enabled boolean,
  integration_produce_enabled boolean,
  integration_consume_enabled boolean,
  configuration_complete boolean,
  active_internal_teams bigint,
  upcoming_events bigint,
  scheduled_events bigint,
  pending_review_events bigint,
  date_tbd_events bigint,
  postponed_events bigint,
  pending_conflicts bigint,
  hard_conflicts bigint,
  warning_conflicts bigint,
  stale_conflicts bigint,
  schedule_state_mismatches bigint,
  accepted_exceptions_24h bigint,
  commands_24h bigint,
  notifications_pending bigint,
  notifications_processing bigint,
  notifications_failed bigint,
  notifications_sent_24h bigint,
  last_flag_change_at timestamptz,
  last_decision_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
  with target_team as materialized (
    select team.id, team.closed_at
    from public.teams team
    where team.id = requested_team_id
  ), flags as (
    select
      coalesce(bool_or(flag.enabled) filter (
        where flag.feature = 'professional_scheduling'
      ), false) as professional_scheduling_enabled,
      coalesce(bool_or(flag.enabled) filter (
        where flag.feature = 'whatsapp_delivery'
      ), false) as whatsapp_delivery_enabled
    from public.team_feature_flags flag
    where flag.team_id = requested_team_id
  ), controls as (
    select
      coalesce(bool_or(control.enabled) filter (
        where control.control = 'integration_produce'
      ), false) as integration_produce_enabled,
      coalesce(bool_or(control.enabled) filter (
        where control.control = 'integration_consume'
      ), false) as integration_consume_enabled
    from public.runtime_controls control
  ), configuration as (
    select
      exists (
        select 1
        from public.team_professional_scheduling_settings settings
        join public.team_squad_presets home_team
          on home_team.id = settings.default_home_team_id
          and home_team.team_id = settings.team_id
          and home_team.is_active
        join public.team_squad_presets away_team
          on away_team.id = settings.default_away_team_id
          and away_team.team_id = settings.team_id
          and away_team.is_active
        where settings.team_id = requested_team_id
          and home_team.id <> away_team.id
      ) as configuration_complete,
      count(*) filter (where preset.is_active) as active_internal_teams
    from public.team_squad_presets preset
    where preset.team_id = requested_team_id
  ), upcoming as materialized (
    select event.id, event.professional_schedule_state, event.schedule_version
    from public.events event
    where event.team_id = requested_team_id
      and event.status = 'scheduled'
      and event.starts_at > now()
  ), event_metrics as (
    select count(*) as upcoming_events,
      count(*) filter (
        where professional_schedule_state = 'scheduled'
      ) as scheduled_events,
      count(*) filter (
        where professional_schedule_state = 'pending_review'
      ) as pending_review_events,
      count(*) filter (
        where professional_schedule_state = 'date_tbd'
      ) as date_tbd_events,
      count(*) filter (
        where professional_schedule_state = 'postponed'
      ) as postponed_events
    from upcoming
  ), conflict_metrics as (
    select
      count(*) filter (where conflict.status = 'pending') as pending_conflicts,
      count(*) filter (
        where conflict.status = 'pending' and conflict.severity = 'hard'
      ) as hard_conflicts,
      count(*) filter (
        where conflict.status = 'pending' and conflict.severity = 'warning'
      ) as warning_conflicts,
      count(*) filter (
        where conflict.status = 'pending'
          and conflict.detected_schedule_version <> event.schedule_version
      ) as stale_conflicts
    from public.event_schedule_conflicts conflict
    join public.events event
      on event.id = conflict.event_id and event.team_id = conflict.team_id
    where conflict.team_id = requested_team_id
  ), consistency as (
    select count(*) as schedule_state_mismatches
    from upcoming event
    where (
      event.professional_schedule_state = 'pending_review'
      and not exists (
        select 1 from public.event_schedule_conflicts conflict
        where conflict.event_id = event.id
          and conflict.team_id = requested_team_id
          and conflict.status = 'pending'
          and conflict.detected_schedule_version = event.schedule_version
      )
    ) or (
      event.professional_schedule_state <> 'pending_review'
      and exists (
        select 1 from public.event_schedule_conflicts conflict
        where conflict.event_id = event.id
          and conflict.team_id = requested_team_id
          and conflict.status = 'pending'
          and conflict.detected_schedule_version = event.schedule_version
      )
    )
  ), decision_metrics as (
    select
      count(*) filter (
        where decision.decision = 'accept_exception'
          and decision.created_at >= now() - interval '24 hours'
      ) as accepted_exceptions_24h,
      max(decision.created_at) as last_decision_at
    from public.event_schedule_decisions decision
    where decision.team_id = requested_team_id
  ), command_metrics as (
    select count(*) as commands_24h
    from (
      select command.created_at
      from public.professional_scheduling_commands command
      where command.team_id = requested_team_id
      union all
      select command.created_at
      from private.event_schedule_commands command
      where command.team_id = requested_team_id
    ) command
    where command.created_at >= now() - interval '24 hours'
  ), notification_metrics as (
    select
      count(*) filter (where outbox.status = 'pending') as pending,
      count(*) filter (where outbox.status = 'processing') as processing,
      count(*) filter (where outbox.status = 'failed') as failed,
      count(*) filter (
        where outbox.status = 'sent'
          and outbox.processed_at >= now() - interval '24 hours'
      ) as sent_24h
    from public.notification_outbox outbox
    where outbox.team_id = requested_team_id
      and outbox.template_key = 'event_schedule_change'
  )
  select now(), target_team.closed_at is null,
    flags.professional_scheduling_enabled,
    flags.whatsapp_delivery_enabled,
    controls.integration_produce_enabled,
    controls.integration_consume_enabled,
    configuration.configuration_complete,
    configuration.active_internal_teams,
    event_metrics.upcoming_events,
    event_metrics.scheduled_events,
    event_metrics.pending_review_events,
    event_metrics.date_tbd_events,
    event_metrics.postponed_events,
    conflict_metrics.pending_conflicts,
    conflict_metrics.hard_conflicts,
    conflict_metrics.warning_conflicts,
    conflict_metrics.stale_conflicts,
    consistency.schedule_state_mismatches,
    decision_metrics.accepted_exceptions_24h,
    command_metrics.commands_24h,
    notification_metrics.pending,
    notification_metrics.processing,
    notification_metrics.failed,
    notification_metrics.sent_24h,
    (select max(audit.created_at) from public.audit_logs audit
      where audit.team_id = requested_team_id
        and audit.action = 'feature_flag.changed'
        and audit.entity_type = 'team_feature_flag'
        and audit.entity_id = 'professional_scheduling'),
    decision_metrics.last_decision_at
  from target_team, flags, controls, configuration, event_metrics,
    conflict_metrics, consistency, decision_metrics, command_metrics,
    notification_metrics;
$$;

revoke all on function public.get_r13_pilot_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_r13_pilot_health(uuid)
  to service_role;

comment on function public.get_r13_pilot_health(uuid) is
  'Returns aggregate, PII-free R13 scheduling health, consistency and rollback signals for one pilot team.';

-- O PostgreSQL hospedado pode materializar anon/authenticated nas default ACLs
-- de funções. Revogar somente PUBLIC não remove esses grants explícitos. O
-- censo de robustez restaura o contrato mínimo já declarado/testado.
revoke execute on function public.submit_athlete_registration(
  text,text,text,date,text,text,boolean,boolean
) from anon, authenticated;
revoke execute on function public.get_team_invitation_preview(text)
  from anon, authenticated;
revoke execute on function public.complete_verified_athlete_registration(
  text,text,text,text,boolean,boolean,text[]
) from anon;
revoke execute on function public.remove_athlete_from_team(uuid) from anon;
revoke execute on function public.replace_my_player_photo(text) from anon;
revoke execute on function public.remove_my_player_photo() from anon;
revoke execute on function public.set_team_feature_flag(
  uuid,public.feature_key,boolean
) from anon;
revoke execute on function public.set_runtime_control(
  public.runtime_control_key,boolean
) from anon, authenticated;
revoke execute on function public.issue_event_access_credential(uuid,uuid)
  from anon;
revoke execute on function public.resolve_event_access_for_verified_session(uuid)
  from anon;
revoke execute on function public.enqueue_event_whatsapp_call(uuid,text,text)
  from anon;
revoke execute on function public.claim_notification_batch(integer,integer)
  from anon, authenticated;
revoke execute on function public.release_notification_claim(uuid,uuid)
  from anon, authenticated;
revoke execute on function public.record_notification_callback_by_attempt_id(
  uuid,text,text,text
) from anon, authenticated;
revoke execute on function public.create_team_for_current_user(
  text,text,public.sport_format
) from anon;
revoke execute on function public.set_all_product_features(boolean)
  from anon, authenticated;
revoke execute on function public.issue_lifecycle_authorization(
  uuid,uuid,public.lifecycle_authorization_purpose,uuid
) from anon, authenticated;
revoke execute on function public.leave_my_team(uuid,uuid) from anon;
revoke execute on function public.get_my_registration_email_preference(uuid)
  from anon;
