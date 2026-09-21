export type ChampionshipFollowupHealth = {
  observed_at: string;
  team_open: boolean;
  clear_championship_workspace_enabled: boolean;
  total_championships: number;
  followup_championships: number;
  configuration_championships: number;
  total_fixtures: number;
  linked_fixtures: number;
  last_flag_change_at: string | null;
};

export function runChampionshipFollowupPilotHealth(input: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<ChampionshipFollowupHealth>;
