export type R12PilotHealth = {
  observed_at: string;
  team_open: boolean;
  account_autonomy_enabled: boolean;
  registration_email_alerts_enabled: boolean;
  registration_email_delivery_enabled: boolean;
  pending_account_closures: number;
  stalled_account_closures: number;
  pending_team_storage_jobs: number;
  failed_team_storage_jobs: number;
  pending_email_events: number;
  pending_email_deliveries: number;
  failed_email_deliveries: number;
  review_email_deliveries: number;
  lifecycle_commands_24h: number;
  registration_email_commands_24h: number;
  last_control_change_at: string | null;
  last_lifecycle_command_at: string | null;
  last_registration_email_command_at: string | null;
};

export type R12PilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runR12PilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectAccountAutonomy?: boolean;
  expectEmailAlerts?: boolean;
  expectEmailDelivery?: boolean;
  expectLifecycleActivity?: boolean;
  expectEmailActivity?: boolean;
  fetchImpl?: R12PilotHealthFetch;
}): Promise<R12PilotHealth>;
