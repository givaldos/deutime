export type EventSharePilotHealth = {
  observed_at: string;
  event_share_card_enabled: boolean;
  public_event_page_enabled: boolean;
  event_matches_enabled: boolean;
  voting_enabled: boolean;
  window_events: number;
  projected_events: number;
  fallback_events: number;
  call_events: number;
  lineup_events: number;
  live_events: number;
  voting_events: number;
  result_events: number;
  score_events: number;
  cancelled_events: number;
  completed_events: number;
  last_flag_change_at: string | null;
};

export type EventSharePilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runEventSharePilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  fetchImpl?: EventSharePilotHealthFetch;
}): Promise<EventSharePilotHealth>;
