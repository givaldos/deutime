-- Inert expansion for two lifetime WhatsApp reminder quotas per event.

create type public.event_reminder_slot_key as enum (
  'reminder_1',
  'reminder_2'
);

create type public.event_reminder_slot_status as enum (
  'scheduled',
  'processing',
  'enqueued',
  'skipped',
  'cancelled'
);

create table public.team_whatsapp_reminder_settings (
  team_id uuid primary key references public.teams (id) on delete cascade,
  first_offset_minutes integer not null default 4320 check (
    first_offset_minutes between 1442 and 43200
  ),
  second_offset_minutes integer not null default 2880 check (
    second_offset_minutes between 1441 and 43199
  ),
  updated_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_offset_minutes > second_offset_minutes)
);

create table public.event_whatsapp_reminder_settings (
  event_id uuid primary key,
  team_id uuid not null,
  first_offset_minutes integer not null check (
    first_offset_minutes between 1 and 43200
  ),
  second_offset_minutes integer not null check (
    second_offset_minutes between 1 and 43199
  ),
  is_override boolean not null default false,
  configured_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_offset_minutes > second_offset_minutes),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade
);

create table public.event_whatsapp_reminder_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_id uuid not null,
  slot_key public.event_reminder_slot_key not null,
  status public.event_reminder_slot_status not null default 'scheduled',
  scheduled_for timestamptz not null,
  observed_schedule_version bigint not null check (observed_schedule_version > 0),
  template_key text not null check (
    template_key = 'event_reminder'
  ),
  template_version text not null check (
    template_version in ('first_card_v2', 'last_card_v2')
  ),
  triggered_manually boolean not null default false,
  consumed_at timestamptz,
  status_reason text check (
    status_reason is null or char_length(status_reason) between 2 and 120
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, slot_key),
  unique (id, team_id),
  foreign key (event_id, team_id)
    references public.events (id, team_id) on delete cascade,
  check (
    (slot_key = 'reminder_1' and template_version = 'first_card_v2')
    or (slot_key = 'reminder_2' and template_version = 'last_card_v2')
  ),
  check (
    (status in ('scheduled', 'processing') and consumed_at is null)
    or (status in ('enqueued', 'skipped', 'cancelled') and consumed_at is not null)
  )
);

create index event_whatsapp_reminder_slots_due_idx
  on public.event_whatsapp_reminder_slots (scheduled_for, id)
  where status = 'scheduled';

alter table public.notification_outbox
  add column reminder_slot_id uuid,
  add constraint notification_outbox_reminder_slot_team_fk
    foreign key (reminder_slot_id, team_id)
    references public.event_whatsapp_reminder_slots (id, team_id)
    on delete restrict;

create unique index notification_outbox_one_athlete_per_reminder_slot_idx
  on public.notification_outbox (reminder_slot_id, athlete_id)
  where reminder_slot_id is not null;

create or replace function private.reminder_slot_due_state(
  requested_scheduled_for timestamptz,
  requested_attendance_deadline timestamptz,
  requested_event_status public.event_status
)
returns table (
  status public.event_reminder_slot_status,
  consumed_at timestamptz,
  status_reason text
)
language sql
volatile
set search_path = ''
as $$
  select
    case
      when requested_event_status <> 'scheduled'
        then 'cancelled'::public.event_reminder_slot_status
      when requested_scheduled_for <= now()
        then 'skipped'::public.event_reminder_slot_status
      when requested_attendance_deadline is not null
        and requested_scheduled_for >= requested_attendance_deadline
        then 'skipped'::public.event_reminder_slot_status
      else 'scheduled'::public.event_reminder_slot_status
    end,
    case
      when requested_event_status <> 'scheduled'
        or requested_scheduled_for <= now()
        or (
          requested_attendance_deadline is not null
          and requested_scheduled_for >= requested_attendance_deadline
        )
        then now()
      else null
    end,
    case
      when requested_event_status <> 'scheduled' then 'event_not_scheduled'
      when requested_scheduled_for <= now() then 'trigger_already_passed'
      when requested_attendance_deadline is not null
        and requested_scheduled_for >= requested_attendance_deadline
        then 'deadline_conflict'
      else null
    end;
$$;

create or replace function private.materialize_event_whatsapp_reminders(
  requested_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event record;
  target_settings public.event_whatsapp_reminder_settings%rowtype;
  first_for timestamptz;
  second_for timestamptz;
begin
  select e.*
  into target_event
  from public.events e
  where e.id = requested_event_id
  for update;

  if target_event.id is null then
    return;
  end if;

  insert into public.event_whatsapp_reminder_settings (
    event_id,
    team_id,
    first_offset_minutes,
    second_offset_minutes,
    is_override,
    configured_by
  )
  select
    target_event.id,
    target_event.team_id,
    coalesce(team_settings.first_offset_minutes, 4320),
    coalesce(team_settings.second_offset_minutes, 2880),
    false,
    target_event.created_by
  from (select 1) seed
  left join public.team_whatsapp_reminder_settings team_settings
    on team_settings.team_id = target_event.team_id
  on conflict (event_id) do nothing;

  select settings.*
  into target_settings
  from public.event_whatsapp_reminder_settings settings
  where settings.event_id = target_event.id;

  first_for := target_event.starts_at - pg_catalog.make_interval(
    mins => target_settings.first_offset_minutes
  );
  second_for := target_event.starts_at - pg_catalog.make_interval(
    mins => target_settings.second_offset_minutes
  );

  insert into public.event_whatsapp_reminder_slots (
    event_id,
    team_id,
    slot_key,
    status,
    scheduled_for,
    observed_schedule_version,
    template_key,
    template_version,
    consumed_at,
    status_reason
  )
  select
    target_event.id,
    target_event.team_id,
    proposed.slot_key,
    due.status,
    proposed.scheduled_for,
    target_event.schedule_version,
    'event_reminder',
    proposed.template_version,
    due.consumed_at,
    due.status_reason
  from (
    values
      ('reminder_1'::public.event_reminder_slot_key, first_for, 'first_card_v2'),
      ('reminder_2'::public.event_reminder_slot_key, second_for, 'last_card_v2')
  ) proposed(slot_key, scheduled_for, template_version)
  cross join lateral private.reminder_slot_due_state(
    proposed.scheduled_for,
    target_event.attendance_deadline,
    target_event.status
  ) due
  on conflict (event_id, slot_key) do nothing;
end;
$$;

create or replace function private.sync_event_whatsapp_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.event_whatsapp_reminder_settings%rowtype;
  first_for timestamptz;
  second_for timestamptz;
  first_due record;
  second_due record;
begin
  if tg_op = 'INSERT' then
    perform private.materialize_event_whatsapp_reminders(new.id);
    return new;
  end if;

  if new.starts_at is not distinct from old.starts_at
    and new.attendance_deadline is not distinct from old.attendance_deadline
    and new.status is not distinct from old.status
    and new.schedule_version is not distinct from old.schedule_version
  then
    return new;
  end if;

  select current_settings.*
  into settings
  from public.event_whatsapp_reminder_settings current_settings
  where current_settings.event_id = new.id;

  if settings.event_id is null then
    return new;
  end if;

  first_for := new.starts_at - pg_catalog.make_interval(
    mins => settings.first_offset_minutes
  );
  second_for := new.starts_at - pg_catalog.make_interval(
    mins => settings.second_offset_minutes
  );

  select due.* into first_due
  from private.reminder_slot_due_state(
    first_for, new.attendance_deadline, new.status
  ) due;

  select due.* into second_due
  from private.reminder_slot_due_state(
    second_for, new.attendance_deadline, new.status
  ) due;

  update public.event_whatsapp_reminder_slots slot
  set
    scheduled_for = first_for,
    observed_schedule_version = new.schedule_version,
    status = first_due.status,
    consumed_at = first_due.consumed_at,
    status_reason = first_due.status_reason,
    updated_at = now()
  where slot.event_id = new.id
    and slot.slot_key = 'reminder_1'
    and slot.status = 'scheduled';

  update public.event_whatsapp_reminder_slots slot
  set
    scheduled_for = second_for,
    observed_schedule_version = new.schedule_version,
    status = second_due.status,
    consumed_at = second_due.consumed_at,
    status_reason = second_due.status_reason,
    updated_at = now()
  where slot.event_id = new.id
    and slot.slot_key = 'reminder_2'
    and slot.status = 'scheduled';

  return new;
end;
$$;

create trigger events_sync_whatsapp_reminders
  after insert or update of starts_at, attendance_deadline, status, schedule_version
  on public.events
  for each row execute function private.sync_event_whatsapp_reminders();

create or replace function public.set_team_whatsapp_reminder_settings(
  requested_team_id uuid,
  requested_first_offset_minutes integer,
  requested_second_offset_minutes integer
)
returns public.team_whatsapp_reminder_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_settings public.team_whatsapp_reminder_settings;
begin
  if not private.is_team_staff(
    requested_team_id,
    array['owner', 'admin']::public.team_role[]
  ) then
    raise exception 'Somente owner ou admin pode configurar lembretes'
      using errcode = '42501';
  end if;

  if requested_first_offset_minutes not between 1442 and 43200
    or requested_second_offset_minutes not between 1441 and 43199
    or requested_first_offset_minutes <= requested_second_offset_minutes
  then
    raise exception 'Horários de lembrete inválidos'
      using errcode = '22023';
  end if;

  insert into public.team_whatsapp_reminder_settings (
    team_id,
    first_offset_minutes,
    second_offset_minutes,
    updated_by
  )
  values (
    requested_team_id,
    requested_first_offset_minutes,
    requested_second_offset_minutes,
    (select auth.uid())
  )
  on conflict (team_id) do update
  set
    first_offset_minutes = excluded.first_offset_minutes,
    second_offset_minutes = excluded.second_offset_minutes,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into changed_settings;

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    requested_team_id,
    (select auth.uid()),
    'whatsapp.reminder_settings.changed',
    'team',
    requested_team_id::text,
    jsonb_build_object(
      'first_offset_minutes', requested_first_offset_minutes,
      'second_offset_minutes', requested_second_offset_minutes
    )
  );

  return changed_settings;
end;
$$;

create or replace function public.set_event_whatsapp_reminder_override(
  requested_team_id uuid,
  requested_event_id uuid,
  requested_first_offset_minutes integer default null,
  requested_second_offset_minutes integer default null
)
returns public.event_whatsapp_reminder_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.events%rowtype;
  team_settings public.team_whatsapp_reminder_settings%rowtype;
  effective_first integer;
  effective_second integer;
  changed_settings public.event_whatsapp_reminder_settings;
begin
  select e.*
  into target_event
  from public.events e
  where e.id = requested_event_id
    and e.team_id = requested_team_id
  for update;

  if target_event.id is null
    or not private.is_team_staff(
      requested_team_id,
      array['owner', 'admin']::public.team_role[]
    )
  then
    raise exception 'Somente owner ou admin pode configurar lembretes'
      using errcode = '42501';
  end if;

  if target_event.status <> 'scheduled' or target_event.starts_at <= now() then
    raise exception 'Somente eventos futuros aceitam configuração de lembretes'
      using errcode = '55000';
  end if;

  select settings.*
  into team_settings
  from public.team_whatsapp_reminder_settings settings
  where settings.team_id = requested_team_id;

  effective_first := coalesce(
    requested_first_offset_minutes,
    team_settings.first_offset_minutes,
    4320
  );
  effective_second := coalesce(
    requested_second_offset_minutes,
    team_settings.second_offset_minutes,
    2880
  );

  if effective_first not between 1 and 43200
    or effective_second not between 1 and 43199
    or effective_first <= effective_second
    or (
      target_event.attendance_deadline is not null
      and target_event.starts_at - pg_catalog.make_interval(mins => effective_second)
        >= target_event.attendance_deadline
    )
  then
    raise exception 'Horários de lembrete inválidos para o prazo do evento'
      using errcode = '22023';
  end if;

  insert into public.event_whatsapp_reminder_settings (
    event_id,
    team_id,
    first_offset_minutes,
    second_offset_minutes,
    is_override,
    configured_by
  )
  values (
    target_event.id,
    target_event.team_id,
    effective_first,
    effective_second,
    requested_first_offset_minutes is not null
      or requested_second_offset_minutes is not null,
    (select auth.uid())
  )
  on conflict (event_id) do update
  set
    first_offset_minutes = excluded.first_offset_minutes,
    second_offset_minutes = excluded.second_offset_minutes,
    is_override = excluded.is_override,
    configured_by = excluded.configured_by,
    updated_at = now()
  returning * into changed_settings;

  update public.event_whatsapp_reminder_slots slot
  set
    scheduled_for = case slot.slot_key
      when 'reminder_1' then target_event.starts_at - pg_catalog.make_interval(
        mins => effective_first
      )
      else target_event.starts_at - pg_catalog.make_interval(
        mins => effective_second
      )
    end,
    status = case
      when (
        case slot.slot_key
          when 'reminder_1' then target_event.starts_at - pg_catalog.make_interval(
            mins => effective_first
          )
          else target_event.starts_at - pg_catalog.make_interval(
            mins => effective_second
          )
        end
      ) <= now() then 'skipped'::public.event_reminder_slot_status
      else 'scheduled'::public.event_reminder_slot_status
    end,
    consumed_at = case
      when (
        case slot.slot_key
          when 'reminder_1' then target_event.starts_at - pg_catalog.make_interval(
            mins => effective_first
          )
          else target_event.starts_at - pg_catalog.make_interval(
            mins => effective_second
          )
        end
      ) <= now() then now()
      else null
    end,
    status_reason = case
      when (
        case slot.slot_key
          when 'reminder_1' then target_event.starts_at - pg_catalog.make_interval(
            mins => effective_first
          )
          else target_event.starts_at - pg_catalog.make_interval(
            mins => effective_second
          )
        end
      ) <= now() then 'trigger_already_passed'
      else null
    end,
    updated_at = now()
  where slot.event_id = target_event.id
    and slot.status = 'scheduled';

  insert into public.audit_logs (
    team_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    requested_team_id,
    (select auth.uid()),
    'whatsapp.event_reminder_settings.changed',
    'event',
    requested_event_id::text,
    jsonb_build_object(
      'is_override', changed_settings.is_override,
      'first_offset_minutes', effective_first,
      'second_offset_minutes', effective_second
    )
  );

  return changed_settings;
end;
$$;

-- Existing data receives inert defaults and two non-renewable slots.
insert into public.team_whatsapp_reminder_settings (team_id, updated_by)
select team.id, team.created_by
from public.teams team
on conflict (team_id) do nothing;

select private.materialize_event_whatsapp_reminders(event.id)
from public.events event;

create or replace function private.initialize_team_whatsapp_reminder_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_whatsapp_reminder_settings (team_id, updated_by)
  values (new.id, new.created_by)
  on conflict (team_id) do nothing;
  return new;
end;
$$;

create trigger teams_initialize_whatsapp_reminder_settings
  after insert on public.teams
  for each row execute function private.initialize_team_whatsapp_reminder_settings();

alter table public.team_whatsapp_reminder_settings enable row level security;
alter table public.event_whatsapp_reminder_settings enable row level security;
alter table public.event_whatsapp_reminder_slots enable row level security;

create policy team_whatsapp_reminder_settings_select_admin
  on public.team_whatsapp_reminder_settings
  for select to authenticated
  using (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  );

create policy event_whatsapp_reminder_settings_select_admin
  on public.event_whatsapp_reminder_settings
  for select to authenticated
  using (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  );

create policy event_whatsapp_reminder_slots_select_admin
  on public.event_whatsapp_reminder_slots
  for select to authenticated
  using (
    private.is_team_staff(
      team_id,
      array['owner', 'admin']::public.team_role[]
    )
  );

revoke all on public.team_whatsapp_reminder_settings
  from public, anon, authenticated;
revoke all on public.event_whatsapp_reminder_settings
  from public, anon, authenticated;
revoke all on public.event_whatsapp_reminder_slots
  from public, anon, authenticated;
grant select on public.team_whatsapp_reminder_settings to authenticated;
grant select on public.event_whatsapp_reminder_settings to authenticated;
grant select on public.event_whatsapp_reminder_slots to authenticated;

revoke all on function private.reminder_slot_due_state(
  timestamptz, timestamptz, public.event_status
) from public, anon, authenticated;
revoke all on function private.materialize_event_whatsapp_reminders(uuid)
  from public, anon, authenticated;
revoke all on function private.sync_event_whatsapp_reminders()
  from public, anon, authenticated;
revoke all on function private.initialize_team_whatsapp_reminder_settings()
  from public, anon, authenticated;
revoke all on function public.set_team_whatsapp_reminder_settings(
  uuid, integer, integer
) from public, anon, authenticated;
revoke all on function public.set_event_whatsapp_reminder_override(
  uuid, uuid, integer, integer
) from public, anon, authenticated;

grant execute on function public.set_team_whatsapp_reminder_settings(
  uuid, integer, integer
) to authenticated;
grant execute on function public.set_event_whatsapp_reminder_override(
  uuid, uuid, integer, integer
) to authenticated;

create trigger team_whatsapp_reminder_settings_set_updated_at
  before update on public.team_whatsapp_reminder_settings
  for each row execute function private.set_updated_at();
create trigger event_whatsapp_reminder_settings_set_updated_at
  before update on public.event_whatsapp_reminder_settings
  for each row execute function private.set_updated_at();
create trigger event_whatsapp_reminder_slots_set_updated_at
  before update on public.event_whatsapp_reminder_slots
  for each row execute function private.set_updated_at();

comment on table public.event_whatsapp_reminder_slots is
  'Two lifetime, non-renewable WhatsApp reminder quotas per event. External effects remain disabled until the consuming release is enabled.';
