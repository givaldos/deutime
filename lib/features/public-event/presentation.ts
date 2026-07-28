import type { Database } from "@/lib/database.types";

export type PublicEventStatus =
  Database["public"]["Enums"]["event_status"];
export type PublicEventKind = Database["public"]["Enums"]["event_kind"];
export type PublicEventSportFormat =
  Database["public"]["Enums"]["sport_format"];

const publicEventIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const publicEventKindLabels: Record<PublicEventKind, string> = {
  weekly_match: "Racha semanal",
  championship: "Campeonato",
  friendly: "Amistoso",
  tournament: "Torneio",
  training: "Treino",
  other: "Outro evento",
};

export const publicEventFormatLabels: Record<PublicEventSportFormat, string> = {
  field: "Futebol de campo",
  society: "Futebol society",
  futsal: "Futsal",
};

export const publicEventStatusPresentation: Record<
  PublicEventStatus,
  { label: string; description: string; tone: "emerald" | "amber" | "slate" }
> = {
  scheduled: {
    label: "Evento agendado",
    description: "Confira os detalhes compartilhados pelo time.",
    tone: "emerald",
  },
  cancelled: {
    label: "Evento cancelado",
    description:
      "O time cancelou este evento. Este endereço continua válido para consulta.",
    tone: "amber",
  },
  completed: {
    label: "Evento encerrado",
    description:
      "Este evento já terminou. O endereço permanece como histórico.",
    tone: "slate",
  },
};

export function isPublicEventId(candidate: string) {
  return publicEventIdPattern.test(candidate);
}

export function isPublicEventContractUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : null;
  if (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205"
  ) {
    return true;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  return (
    message.includes("public_event_directory") &&
    (message.includes("not find") ||
      message.includes("does not exist") ||
      message.includes("schema cache"))
  );
}

export function formatPublicEventDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeZone,
  }).format(new Date(value));
}

export function formatPublicEventTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

export function formatPublicEventTimeZone(timeZone: string) {
  const city = timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone;
  return city === "Sao Paulo" ? "São Paulo" : city;
}
