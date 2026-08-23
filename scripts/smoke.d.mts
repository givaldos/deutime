export type SmokeFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runProductionSmoke(options: {
  mode?: string;
  appUrl: string;
  publicEventId?: string;
  expectEventShareCardEnabled?: boolean;
  publicChampionshipId?: string;
  expectChampionshipEnabled?: boolean;
  publicPlayerHandle?: string;
  expectRecognitionSummary?: boolean;
  fetchImpl?: SmokeFetch;
}): Promise<{
  publicEventChecked: boolean;
  publicChampionshipChecked: boolean;
  publicPlayerChecked: boolean;
}>;

export function validatePublicEventId(publicEventId: string): void;
export function validatePublicChampionshipId(
  publicChampionshipId: string,
): void;
export function validatePublicPlayerHandle(handle: string): void;
