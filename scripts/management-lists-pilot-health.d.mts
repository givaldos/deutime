export type ManagementListsPilotHealth = {
  observed_at: string;
  team_open: boolean;
  complete_management_lists_enabled: boolean;
  total_events: number;
  upcoming_events: number;
  reschedule_events: number;
  total_championships: number;
  last_flag_change_at: string | null;
};

export type ManagementListsPilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runManagementListsPilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  fetchImpl?: ManagementListsPilotHealthFetch;
}): Promise<ManagementListsPilotHealth>;
