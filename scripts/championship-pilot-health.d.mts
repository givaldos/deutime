export type ChampionshipPilotHealth = {
  observed_at: string;
  championships_enabled: boolean;
  public_event_page_enabled: boolean;
  championships_total: number;
  draft_championships: number;
  published_championships: number;
  active_championships: number;
  completed_championships: number;
  archived_championships: number;
  league_championships: number;
  groups_knockout_championships: number;
  knockout_championships: number;
  page_candidates: number;
  projected_championships: number;
  fallback_championships: number;
  participants_total: number;
  fixtures_total: number;
  linked_fixtures: number;
  finalized_fixtures: number;
  void_fixtures: number;
  resolved_fixtures: number;
  projected_participants: number;
  projected_fixtures: number;
  projected_standings: number;
  reconstruction_mismatches: number;
  commands_24h: number;
  last_command_at: string | null;
  last_flag_change_at: string | null;
};

export type ChampionshipPilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runChampionshipPilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  expectProjection?: boolean;
  fetchImpl?: ChampionshipPilotHealthFetch;
}): Promise<ChampionshipPilotHealth>;
