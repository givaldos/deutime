export type RecognitionPilotHealth = {
  observed_at: string;
  recognition_enabled: boolean;
  activation_captured: boolean;
  active_claimed_athletes: number;
  source_cards: number;
  source_goal_cards: number;
  source_assist_cards: number;
  source_crowd_star_cards: number;
  projected_cards: number;
  projected_goal_cards: number;
  projected_assist_cards: number;
  projected_crowd_star_cards: number;
  reconstruction_mismatches: number;
  granted_consents: number;
  revoked_consents: number;
  public_cards: number;
  consent_commands_24h: number;
  last_consent_command_at: string | null;
  last_flag_change_at: string | null;
  activated_at: string | null;
};

export type RecognitionPilotHealthFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runRecognitionPilotHealth(options: {
  supabaseUrl: string;
  secretKey: string;
  teamId: string;
  expectEnabled?: boolean;
  expectProjection?: boolean;
  expectPublicSummary?: boolean;
  fetchImpl?: RecognitionPilotHealthFetch;
}): Promise<RecognitionPilotHealth>;
