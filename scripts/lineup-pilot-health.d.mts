export type LineupPilotHealth = {
  observed_at: string;
  team_division_enabled: boolean;
  public_event_page_enabled: boolean;
  scheduled_events: number;
  draft_events: number;
  draft_squads: number;
  draft_assignments: number;
  draft_exclusions: number;
  active_revisions: number;
  published_squads: number;
  published_assignments: number;
  consented_published_assignments: number;
  publications_24h: number;
  withdrawals_24h: number;
  last_draft_at: string | null;
  last_publication_at: string | null;
  last_withdrawal_at: string | null;
};

export type LineupPilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runLineupPilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  fetchImpl?: LineupPilotHealthFetch;
}): Promise<LineupPilotHealth>;
