import { isPublicEventId } from "@/lib/features/public-event/presentation";

export const EVENT_ACCESS_COOKIE_NAME = "dt_event_access";

const accessSecretPattern = /^[A-Za-z0-9_-]{43}$/;

export const eventResponseStatuses = [
  "confirmed",
  "declined",
  "maybe",
] as const;

export type EventResponseStatus = (typeof eventResponseStatuses)[number];

export const attendanceStatusLabels = {
  pending: "Aguardando resposta",
  confirmed: "Confirmado",
  declined: "Não vou",
  maybe: "Talvez",
  waitlist: "Na lista de espera",
} as const;

export function isEventResponseStatus(
  candidate: unknown,
): candidate is EventResponseStatus {
  return (
    typeof candidate === "string" &&
    eventResponseStatuses.some((status) => status === candidate)
  );
}

export function isEventAccessSecret(candidate: unknown): candidate is string {
  return typeof candidate === "string" && accessSecretPattern.test(candidate);
}

export function eventAccessCookiePath(publicId: string) {
  if (!isPublicEventId(publicId)) return "/e";
  return `/e/${publicId}`;
}

export function readEventAccessFragment(fragment: string) {
  if (!fragment.startsWith("#")) {
    return { hadCredential: false, credential: null };
  }

  const params = new URLSearchParams(fragment.slice(1));
  if (!params.has("c")) {
    return { hadCredential: false, credential: null };
  }

  const values = params.getAll("c");
  const onlyCredentialParameter = [...params.keys()].every(
    (key) => key === "c",
  );
  const credential =
    values.length === 1 &&
    onlyCredentialParameter &&
    isEventAccessSecret(values[0])
      ? values[0]
      : null;

  return { hadCredential: true, credential };
}
