export type SmokeFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export function runProductionSmoke(options: {
  mode?: string;
  appUrl: string;
  publicEventId?: string;
  fetchImpl?: SmokeFetch;
}): Promise<{ publicEventChecked: boolean }>;

export function validatePublicEventId(publicEventId: string): void;
