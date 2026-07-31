export type RsvpPilotHealth = {
  observed_at: string;
  global_exchange_enabled: boolean;
  team_exchange_enabled: boolean;
  team_rsvp_enabled: boolean;
  active_credentials: number;
  active_capability_sessions: number;
  capability_sessions_created_24h: number;
  capability_sessions_revoked_24h: number;
  rsvp_writes_24h: number;
  last_exchange_at: string | null;
  last_rsvp_at: string | null;
};

export type RsvpPilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runRsvpPilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  fetchImpl?: RsvpPilotHealthFetch;
}): Promise<RsvpPilotHealth>;
