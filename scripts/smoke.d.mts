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
  fetchImpl?: SmokeFetch;
}): Promise<{
  publicEventChecked: boolean;
  publicChampionshipChecked: boolean;
}>;

export function validatePublicEventId(publicEventId: string): void;
export function validatePublicChampionshipId(
  publicChampionshipId: string,
): void;
