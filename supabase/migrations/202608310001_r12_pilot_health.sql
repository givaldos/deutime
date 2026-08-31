-- R12 / WP-R12-06 — sonda operacional agregada e sem PII.
-- Expõe somente controles, contagens e horários necessários para piloto,
-- fallback e rollback. O acesso permanece exclusivo da service_role.

create or replace function public.get_r12_pilot_health(
  requested_team_id uuid
)
returns table (
  observed_at timestamptz,
  team_open boolean,
  account_autonomy_enabled boolean,
  registration_email_alerts_enabled boolean,
  registration_email_delivery_enabled boolean,
  pending_account_closures bigint,
  stalled_account_closures bigint,
  pending_team_storage_jobs bigint,
  failed_team_storage_jobs bigint,
  pending_email_events bigint,
  pending_email_deliveries bigint,
  failed_email_deliveries bigint,
  review_email_deliveries bigint,
  lifecycle_commands_24h bigint,
  registration_email_commands_24h bigint,
  last_control_change_at timestamptz,
  last_lifecycle_command_at timestamptz,
  last_registration_email_command_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set statement_timeout = '10s'
as $$
  with controls as (
    select
      coalesce(bool_or(control.enabled) filter (
        where control.control = 'account_autonomy'::public.runtime_control_key
      ), false) as account_autonomy_enabled,
      coalesce(bool_or(control.enabled) filter (
        where control.control = 'registration_email_alerts'::public.runtime_control_key
      ), false) as registration_email_alerts_enabled,
      coalesce(bool_or(control.enabled) filter (
        where control.control = 'registration_email_delivery'::public.runtime_control_key
      ), false) as registration_email_delivery_enabled
    from public.runtime_controls control
  ), account_metrics as (
    select
      count(*) filter (where closure.status = 'auth_pending') as pending,
      count(*) filter (
        where closure.status = 'auth_pending' and closure.retry_count >= 20
      ) as stalled
    from public.account_closure_requests closure
  ), storage_metrics as (
    select
      count(*) filter (where job.status = 'pending') as pending,
      count(*) filter (
        where job.status = 'pending' and job.last_error_code is not null
      ) as failed
    from private.team_closure_storage_jobs job
    where job.team_id = requested_team_id
  ), email_event_metrics as (
    select count(*) filter (where event.status = 'pending') as pending
    from private.registration_email_events event
    where event.team_id = requested_team_id
  ), email_delivery_metrics as (
    select
      count(*) filter (where outbox.status in ('pending', 'processing')) as pending,
      count(*) filter (where outbox.status = 'failed') as failed,
      count(*) filter (where outbox.status = 'review') as review
    from private.registration_email_outbox outbox
    where outbox.team_id = requested_team_id
  ), audit_metrics as (
    select
      count(*) filter (
        where audit.team_id = requested_team_id
          and audit.action in (
            'account_relationship.withdrawn',
            'account_invitation.declined',
            'account_relationship.left',
            'team_ownership.transferred',
            'teams.closed'
          )
          and audit.created_at >= now() - interval '24 hours'
      ) as lifecycle_commands_24h,
      count(*) filter (
        where audit.team_id = requested_team_id
          and audit.action in (
            'registration_email.queued',
            'registration_email.preference_changed',
            'registration_email.sent'
          )
          and audit.created_at >= now() - interval '24 hours'
      ) as registration_email_commands_24h,
      max(audit.created_at) filter (
        where audit.action = 'runtime_control.changed'
          and audit.entity_type = 'runtime_control'
          and audit.entity_id in (
            'account_autonomy',
            'registration_email_alerts',
            'registration_email_delivery'
          )
      ) as last_control_change_at,
      max(audit.created_at) filter (
        where audit.team_id = requested_team_id
          and audit.action in (
            'account_relationship.withdrawn',
            'account_invitation.declined',
            'account_relationship.left',
            'team_ownership.transferred',
            'teams.closed'
          )
      ) as last_lifecycle_command_at,
      max(audit.created_at) filter (
        where audit.team_id = requested_team_id
          and audit.action in (
            'registration_email.queued',
            'registration_email.preference_changed',
            'registration_email.sent'
          )
      ) as last_registration_email_command_at
    from public.audit_logs audit
  )
  select
    now(),
    team.closed_at is null,
    controls.account_autonomy_enabled,
    controls.registration_email_alerts_enabled,
    controls.registration_email_delivery_enabled,
    account_metrics.pending,
    account_metrics.stalled,
    storage_metrics.pending,
    storage_metrics.failed,
    email_event_metrics.pending,
    email_delivery_metrics.pending,
    email_delivery_metrics.failed,
    email_delivery_metrics.review,
    audit_metrics.lifecycle_commands_24h,
    audit_metrics.registration_email_commands_24h,
    audit_metrics.last_control_change_at,
    audit_metrics.last_lifecycle_command_at,
    audit_metrics.last_registration_email_command_at
  from public.teams team
  cross join controls
  cross join account_metrics
  cross join storage_metrics
  cross join email_event_metrics
  cross join email_delivery_metrics
  cross join audit_metrics
  where team.id = requested_team_id;
$$;

revoke all on function public.get_r12_pilot_health(uuid)
  from public, anon, authenticated;
grant execute on function public.get_r12_pilot_health(uuid)
  to service_role;

comment on function public.get_r12_pilot_health(uuid) is
  'Returns aggregate, PII-free R12 health and rollback signals for one synthetic pilot team.';
