export type R13PilotHealth = {
  observed_at: string;
  team_open: boolean;
  professional_scheduling_enabled: boolean;
  whatsapp_delivery_enabled: boolean;
  integration_produce_enabled: boolean;
  integration_consume_enabled: boolean;
  configuration_complete: boolean;
  active_internal_teams: number;
  upcoming_events: number;
  scheduled_events: number;
  pending_review_events: number;
  date_tbd_events: number;
  postponed_events: number;
  pending_conflicts: number;
  hard_conflicts: number;
  warning_conflicts: number;
  stale_conflicts: number;
  schedule_state_mismatches: number;
  accepted_exceptions_24h: number;
  commands_24h: number;
  notifications_pending: number;
  notifications_processing: number;
  notifications_failed: number;
  notifications_sent_24h: number;
  last_flag_change_at: string | null;
  last_decision_at: string | null;
};

export type R13PilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runR13PilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectProfessionalScheduling?: boolean;
  expectNotificationDelivery?: boolean;
  expectActivity?: boolean;
  fetchImpl?: R13PilotHealthFetch;
}): Promise<R13PilotHealth>;
