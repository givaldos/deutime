export type CalendarWorkspaceHealth = {
  observed_at: string;
  team_open: boolean;
  calendar_workspace_enabled: boolean;
  scheduled_events: number;
  reschedule_events: number;
  pending_conflicts: number;
  last_flag_change_at: string | null;
};

export function runCalendarWorkspacePilotHealth(input: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<CalendarWorkspaceHealth>;
