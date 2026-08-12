import "server-only";

import type { PublicEventShareState } from "@/lib/data/public-event-share";
import {
  formatPublicEventDate,
  formatPublicEventTime,
  publicEventKindLabels,
  type PublicEventKind,
} from "@/lib/features/public-event/presentation";
import { createHash } from "node:crypto";

export type PublicEventSharePresentation = {
  label: string;
  title: string;
  description: string;
  tone: "emerald" | "amber" | "slate";
};

const publicFactLabels: Record<
  NonNullable<PublicEventShareState["match"]>["events"][number]["kind"],
  string
> = {
  goal: "Gol",
  own_goal: "Gol contra",
  yellow_card: "Cartão amarelo",
  red_card: "Cartão vermelho",
  substitution: "Substituição",
  score_adjustment: "Ajuste de placar",
};

export function getPublicFactLabel(
  kind: NonNullable<PublicEventShareState["match"]>["events"][number]["kind"],
) {
  return publicFactLabels[kind];
}

export function getPublicEventSharePresentation(
  state: PublicEventShareState,
): PublicEventSharePresentation {
  const { event } = state;
  const score = state.match ? formatScore(state.match.sides) : null;

  switch (state.phase) {
    case "cancelled":
      return {
        label: "Evento cancelado",
        title: event.title,
        description: `O ${event.team_name} cancelou este evento. O endereço continua válido para consulta.`,
        tone: "amber",
      };
    case "live":
      return {
        label: "Ao vivo",
        title: score ?? event.title,
        description: `Acompanhe o placar e os fatos públicos de ${event.title}.`,
        tone: "emerald",
      };
    case "voting":
      return {
        label: "Votação aberta",
        title: "Vote no Craque da Galera",
        description: `${score ?? event.title}. A votação termina às ${formatPublicEventTime(state.voting!.closes_at, event.team_timezone)}.`,
        tone: "emerald",
      };
    case "result": {
      const result = state.result!;
      if (result.winner_name) {
        return {
          label: "Craque da Galera",
          title: `${result.winner_name} é o Craque da Galera`,
          description: `${result.vote_count} de ${result.total_votes} votos válidos (${formatPercentage(result.vote_percentage!)}).`,
          tone: "emerald",
        };
      }

      return {
        label: "Apuração concluída",
        title: result.tied ? "A votação terminou empatada" : "Resultado apurado",
        description: `${result.total_votes} votos válidos, sem identificação pública de atleta.`,
        tone: "slate",
      };
    }
    case "score":
      return {
        label: "Placar final",
        title: score ?? event.title,
        description: `Resultado final publicado pelo ${event.team_name}.`,
        tone: "slate",
      };
    case "lineup":
      return {
        label: "Times definidos",
        title: event.title,
        description: `Escalação pública da revisão ${state.lineup!.revision}, somente com os primeiros nomes.`,
        tone: "emerald",
      };
    case "completed":
      return {
        label: "Evento encerrado",
        title: event.title,
        description: `O evento do ${event.team_name} terminou. Este endereço permanece como histórico.`,
        tone: "slate",
      };
    case "call":
      return {
        label: "Convocação",
        title: event.title,
        description: `${getKindLabel(event.kind)} do ${event.team_name} em ${formatPublicEventDate(event.starts_at, event.team_timezone)}, às ${formatPublicEventTime(event.starts_at, event.team_timezone)}.`,
        tone: "emerald",
      };
  }
}

export function getPublicEventShareVersion(state: PublicEventShareState) {
  const versionInput = {
    phase: state.phase,
    status: state.event.status,
    startsAt: state.event.starts_at,
    endsAt: state.event.ends_at,
    lineup: state.lineup
      ? {
          revision: state.lineup.revision,
          publishedAt: state.lineup.published_at,
        }
      : null,
    match: state.match
      ? {
          ordinal: state.match.ordinal,
          status: state.match.status,
          publicMode: state.match.public_mode,
          scores: state.match.sides.map((side) => ({
            side: side.side_index,
            score: side.score,
          })),
          events: state.match.events.map((event) => ({
            kind: event.kind,
            side: event.side_index,
            minute: event.minute,
          })),
        }
      : null,
    votingClosesAt: state.voting?.closes_at ?? null,
    result: state.result
      ? {
          winnerVisible: state.result.winner_name !== null,
          voteCount: state.result.vote_count,
          percentage: state.result.vote_percentage,
          totalVotes: state.result.total_votes,
          tied: state.result.tied,
        }
      : null,
  };

  return createHash("sha256")
    .update(JSON.stringify(versionInput))
    .digest("hex")
    .slice(0, 12);
}

function formatScore(
  sides: NonNullable<PublicEventShareState["match"]>["sides"],
) {
  const first = sides.find((side) => side.side_index === 1);
  const second = sides.find((side) => side.side_index === 2);
  if (!first || !second) return null;
  return `${first.label} ${first.score} × ${second.score} ${second.label}`;
}

function getKindLabel(kind: string) {
  return kind in publicEventKindLabels
    ? publicEventKindLabels[kind as PublicEventKind]
    : "Evento";
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value / 100);
}
