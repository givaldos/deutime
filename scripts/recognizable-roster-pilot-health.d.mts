export type RecognizableRosterPilotHealth = {
  observed_at: string;
  team_open: boolean;
  recognizable_roster_enabled: boolean;
  current_athletes: number;
  active_athletes: number;
  pending_athletes: number;
  claimed_athletes: number;
  athletes_with_photo_source: number;
  last_flag_change_at: string | null;
};

export type RecognizableRosterPilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runRecognizableRosterPilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  fetchImpl?: RecognizableRosterPilotHealthFetch;
}): Promise<RecognizableRosterPilotHealth>;
