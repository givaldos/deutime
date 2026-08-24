-- Snapshot global, somente leitura e sem PII para a decisão pós-R10.
-- Toda contagem menor que 3 é suprimida antes de sair do banco.
with
  parameters as (
    select
      now() - interval '30 days' as since_30d,
      now() - interval '90 days' as since_90d
  ),
  counts as (
    select
      (select count(*) from public.teams) as teams_total,
      (
        select count(*)
        from public.teams, parameters
        where teams.created_at >= parameters.since_30d
      ) as teams_created_30d,
      (
        select count(distinct events.team_id)
        from public.events, parameters
        where events.starts_at >= parameters.since_30d
          and events.cancelled_at is null
      ) as active_teams_30d,
      (
        select count(*)
        from (
          select events.team_id
          from public.events, parameters
          where events.starts_at >= parameters.since_90d
            and events.cancelled_at is null
          group by events.team_id
          having count(*) >= 2
        ) repeated
      ) as repeating_teams_90d,
      (
        select count(*)
        from public.events, parameters
        where events.starts_at >= parameters.since_30d
          and events.cancelled_at is null
      ) as events_30d,
      (
        select count(*)
        from public.event_attendance, parameters
        where event_attendance.responded_at >= parameters.since_30d
      ) as attendance_responses_30d,
      (
        select count(*)
        from public.event_matches, parameters
        where event_matches.finalized_at >= parameters.since_90d
      ) as finalized_matches_90d,
      (
        select count(*)
        from public.athletes
        where athletes.status = 'active'
          and athletes.removed_at is null
      ) as active_athletes,
      (
        select count(*)
        from public.athletes
        where athletes.status = 'active'
          and athletes.removed_at is null
          and athletes.user_id is not null
      ) as claimed_athletes,
      (
        select count(*)
        from public.notification_delivery_attempts, parameters
        where notification_delivery_attempts.started_at >= parameters.since_30d
      ) as whatsapp_attempts_30d,
      (
        select count(*)
        from public.notification_delivery_attempts, parameters
        where notification_delivery_attempts.started_at >= parameters.since_30d
          and notification_delivery_attempts.delivery_status in (
            'sent', 'delivered', 'read'
          )
      ) as whatsapp_successes_30d
  )
select
  current_date as snapshot_date,
  case when teams_total >= 3 then teams_total::text else '<3' end as teams_total,
  case when teams_created_30d >= 3 then teams_created_30d::text else '<3' end
    as teams_created_30d,
  case when active_teams_30d >= 3 then active_teams_30d::text else '<3' end
    as active_teams_30d,
  case when repeating_teams_90d >= 3 then repeating_teams_90d::text else '<3' end
    as repeating_teams_90d,
  case when events_30d >= 3 then events_30d::text else '<3' end as events_30d,
  case
    when attendance_responses_30d >= 3 then attendance_responses_30d::text
    else '<3'
  end as attendance_responses_30d,
  case
    when finalized_matches_90d >= 3 then finalized_matches_90d::text
    else '<3'
  end as finalized_matches_90d,
  case when active_athletes >= 3 then active_athletes::text else '<3' end
    as active_athletes,
  case when claimed_athletes >= 3 then claimed_athletes::text else '<3' end
    as claimed_athletes,
  case
    when whatsapp_attempts_30d >= 3 then whatsapp_attempts_30d::text
    else '<3'
  end as whatsapp_attempts_30d,
  case
    when whatsapp_attempts_30d >= 3 then
      round(100.0 * whatsapp_successes_30d / nullif(whatsapp_attempts_30d, 0), 1)::text
    else '<3'
  end as whatsapp_success_rate_percent_30d
from counts;
