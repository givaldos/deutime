"use server";

import { requireUser } from "@/lib/auth/dal";
import { isChampionshipsEnabled } from "@/lib/features/championships/server";
import { createClient } from "@/lib/supabase/server";
import {
  addChampionshipParticipantSchema,
  championshipCommandSchema,
  championshipFormatCommandSchema,
  championshipPublicModeSchema,
  createChampionshipSchema,
  decideChampionshipQualifierSchema,
  linkChampionshipFixtureSchema,
  releaseChampionshipFixtureSchema,
  resolveChampionshipFixtureSchema,
  withdrawChampionshipParticipantSchema,
} from "@/lib/validation/championships";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

export type ChampionshipActionState = {
  attempt?: number;
  outcome?: "success" | "error";
  message?: string;
  nextRequestId?: string;
};

function errorMessage(
  code: string | undefined,
  fallback: string,
): string {
  if (code === "42501") return "Você não tem permissão para fazer isso.";
  if (code === "55000") return "O campeonato não aceita esta alteração agora.";
  if (code === "23505") return "Essa informação já foi usada no campeonato.";
  if (code === "22023" || code === "23514") {
    return "Revise os dados e tente novamente.";
  }
  return fallback;
}

export async function createChampionship(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = createChampionshipSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    requestId: formData.get("requestId"),
    name: formData.get("name"),
    format: formData.get("format"),
    winPoints: formData.get("winPoints"),
    drawPoints: formData.get("drawPoints"),
    lossPoints: formData.get("lossPoints"),
    groupCount: formData.get("groupCount") || undefined,
    qualifiersPerGroup: formData.get("qualifiersPerGroup") || undefined,
    tiebreakOrder: formData.getAll("tiebreakOrder"),
  });
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise o campeonato.",
    };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return {
      attempt,
      outcome: "error",
      message: "Campeonatos ainda não estão disponíveis para este time.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_championship_draft", {
    requested_team_id: parsed.data.teamId,
    request_id: parsed.data.requestId,
    requested_name: parsed.data.name,
    requested_format: parsed.data.format,
    requested_win_points: parsed.data.winPoints,
    requested_draw_points: parsed.data.drawPoints,
    requested_loss_points: parsed.data.lossPoints,
    requested_tiebreak_order: parsed.data.tiebreakOrder,
    requested_group_count: parsed.data.format === "groups_knockout"
      ? parsed.data.groupCount
      : undefined,
    requested_qualifiers_per_group: parsed.data.format === "groups_knockout"
      ? parsed.data.qualifiersPerGroup
      : undefined,
  });
  if (error || !data?.championship_id) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível criar o campeonato."),
    };
  }

  revalidatePath(`/app/${parsed.data.teamSlug}`);
  revalidatePath(`/app/${parsed.data.teamSlug}/championships`);
  redirect(
    `/app/${parsed.data.teamSlug}/championships/${data.championship_id}`,
  );
}

export async function addChampionshipParticipant(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = addChampionshipParticipantSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
    seed: formData.get("seed"),
    groupNumber: formData.get("groupNumber") || undefined,
    kind: formData.get("kind"),
    internalTeamId: formData.get("internalTeamId") ?? undefined,
    externalName: formData.get("externalName") ?? undefined,
    externalColor: formData.get("externalColor") ?? undefined,
    externalBadgeKey: formData.get("externalBadgeKey") ?? undefined,
  });
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise o participante.",
    };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }

  const external = parsed.data.kind === "external";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_championship_participant", {
    requested_championship_id: parsed.data.championshipId,
    request_id: parsed.data.requestId,
    requested_seed: parsed.data.seed,
    requested_group_number: parsed.data.groupNumber ?? null as never,
    requested_internal_team_id: external
      ? null as never
      : parsed.data.internalTeamId as string,
    requested_external_name: external
      ? parsed.data.externalName as string
      : null as never,
    requested_external_color: external
      ? parsed.data.externalColor as string
      : null as never,
    requested_external_badge_key: external
      ? parsed.data.externalBadgeKey as NonNullable<typeof parsed.data.externalBadgeKey>
      : null as never,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível adicionar o participante."),
    };
  }

  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Este participante já estava salvo."
      : "Participante adicionado ao rascunho.",
  };
}

export async function generateLeagueFixtures(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  return runChampionshipCommand(previousState, formData, "generate");
}

export async function generateChampionshipFixtures(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  return runChampionshipFormatCommand(previousState, formData, "generate");
}

export async function publishLeagueChampionship(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  return runChampionshipCommand(previousState, formData, "publish");
}

export async function publishChampionshipFormat(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  return runChampionshipFormatCommand(previousState, formData, "publish");
}

export async function setChampionshipPublicMode(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = championshipPublicModeSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    publicId: formData.get("publicId"),
    requestId: formData.get("requestId"),
    mode: formData.get("mode"),
  });
  if (!parsed.success) {
    return { attempt, outcome: "error", message: "Publicação inválida." };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_championship_public_mode", {
    requested_championship_id: parsed.data.championshipId,
    request_id: parsed.data.requestId,
    requested_mode: parsed.data.mode,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível alterar a página pública."),
    };
  }

  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  revalidatePath(`/c/${parsed.data.publicId}`);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: parsed.data.mode === "public"
      ? data.replayed
        ? "Esta página já estava publicada."
        : "Página publicada. O link já pode ser compartilhado."
      : data.replayed
        ? "Esta página já estava recolhida."
        : "Página recolhida. O link não mostra mais o campeonato.",
  };
}

async function runChampionshipFormatCommand(
  previousState: ChampionshipActionState,
  formData: FormData,
  command: "generate" | "publish",
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = championshipFormatCommandSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
    format: formData.get("format"),
  });
  if (!parsed.success) {
    return { attempt, outcome: "error", message: "Comando inválido." };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }

  const supabase = await createClient();
  const functionName = parsed.data.format === "league"
    ? command === "generate"
      ? "generate_league_fixtures"
      : "publish_league_championship"
    : command === "generate"
      ? "generate_championship_fixtures"
      : "publish_championship_format";
  const { data, error } = await supabase.rpc(functionName, {
    requested_championship_id: parsed.data.championshipId,
    request_id: parsed.data.requestId,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(
        error?.code,
        command === "generate"
          ? "Não foi possível gerar os confrontos."
          : "Não foi possível publicar o campeonato.",
      ),
    };
  }

  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: command === "generate"
      ? data.replayed
        ? "Esta grade já estava gerada."
        : "Confrontos gerados para revisão."
      : data.replayed
        ? "O campeonato já estava publicado."
        : "Campeonato publicado. Agora os confrontos podem receber partidas.",
  };
}

export async function decideChampionshipQualifier(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = decideChampionshipQualifierSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
    groupNumber: formData.get("groupNumber"),
    qualifierPosition: formData.get("qualifierPosition"),
    participantId: formData.get("participantId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise a decisão da vaga.",
    };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_championship_qualifier", {
    requested_championship_id: parsed.data.championshipId,
    request_id: parsed.data.requestId,
    requested_group_number: parsed.data.groupNumber,
    requested_qualifier_position: parsed.data.qualifierPosition,
    requested_participant_id: parsed.data.participantId,
    requested_reason: parsed.data.reason,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível registrar a decisão."),
    };
  }
  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Esta decisão já estava registrada."
      : "Vaga decidida com motivo registrado.",
  };
}

export async function advanceChampionshipGroups(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = championshipCommandSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) {
    return { attempt, outcome: "error", message: "Comando inválido." };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("advance_championship_groups", {
    requested_championship_id: parsed.data.championshipId,
    request_id: parsed.data.requestId,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível montar o mata-mata."),
    };
  }
  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "A chave eliminatória já estava pronta."
      : "Classificados avançaram para o mata-mata.",
  };
}

export async function resolveChampionshipFixture(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = resolveChampionshipFixtureSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
    fixtureId: formData.get("fixtureId"),
    winnerId: formData.get("winnerId") || undefined,
    resolution: formData.get("resolution"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise a decisão eliminatória.",
    };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }
  const supabase = await createClient();
  const manual = parsed.data.resolution !== "score";
  const { data, error } = await supabase.rpc(
    "resolve_championship_knockout_fixture",
    {
      requested_fixture_id: parsed.data.fixtureId,
      request_id: parsed.data.requestId,
      requested_winner_id: manual ? parsed.data.winnerId as string : undefined,
      requested_resolution: manual ? parsed.data.resolution : undefined,
      requested_reason: manual ? parsed.data.reason : undefined,
    },
  );
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível confirmar quem avança."),
    };
  }
  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Este vencedor já estava confirmado."
      : "Vencedor confirmado e chave atualizada.",
  };
}

async function runChampionshipCommand(
  previousState: ChampionshipActionState,
  formData: FormData,
  command: "generate" | "publish",
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = championshipCommandSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) {
    return { attempt, outcome: "error", message: "Comando inválido." };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }

  const supabase = await createClient();
  const functionName = command === "generate"
    ? "generate_league_fixtures"
    : "publish_league_championship";
  const { data, error } = await supabase.rpc(functionName, {
    requested_championship_id: parsed.data.championshipId,
    request_id: parsed.data.requestId,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(
        error?.code,
        command === "generate"
          ? "Não foi possível gerar os confrontos."
          : "Não foi possível publicar o campeonato.",
      ),
    };
  }

  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: command === "generate"
      ? data.replayed
        ? "Esta grade já estava gerada."
        : "Confrontos gerados para revisão."
      : data.replayed
        ? "O campeonato já estava publicado."
        : "Campeonato publicado. Agora os confrontos podem receber partidas.",
  };
}

export async function linkChampionshipFixture(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = linkChampionshipFixtureSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    fixtureId: formData.get("fixtureId"),
    matchId: formData.get("matchId"),
    requestId: formData.get("requestId"),
  });
  if (!parsed.success) {
    return { attempt, outcome: "error", message: "Escolha uma partida válida." };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("link_championship_fixture_match", {
    requested_fixture_id: parsed.data.fixtureId,
    request_id: parsed.data.requestId,
    requested_match_id: parsed.data.matchId,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível vincular a partida."),
    };
  }

  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Este confronto já estava vinculado."
      : "Partida vinculada. O placar da súmula passa a valer na tabela.",
  };
}

export async function releaseChampionshipFixture(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = releaseChampionshipFixtureSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
    fixtureId: formData.get("fixtureId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise a remarcação.",
    };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("release_championship_fixture_match", {
    requested_fixture_id: parsed.data.fixtureId,
    request_id: parsed.data.requestId,
    requested_reason: parsed.data.reason,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível liberar a partida."),
    };
  }

  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Esta partida já estava liberada."
      : "Partida liberada. O confronto pode receber um novo agendamento.",
  };
}

export async function withdrawChampionshipParticipant(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  await requireUser();
  const attempt = (previousState.attempt ?? 0) + 1;
  const parsed = withdrawChampionshipParticipantSchema.safeParse({
    teamId: formData.get("teamId"),
    teamSlug: formData.get("teamSlug"),
    championshipId: formData.get("championshipId"),
    requestId: formData.get("requestId"),
    participantId: formData.get("participantId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      attempt,
      outcome: "error",
      message: parsed.error.issues[0]?.message ?? "Revise a retirada.",
    };
  }
  if (!(await isChampionshipsEnabled(parsed.data.teamId))) {
    return { attempt, outcome: "error", message: "Campeonatos estão desligados." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("withdraw_championship_participant", {
    requested_participant_id: parsed.data.participantId,
    request_id: parsed.data.requestId,
    requested_reason: parsed.data.reason,
  });
  if (error || !data) {
    return {
      attempt,
      outcome: "error",
      message: errorMessage(error?.code, "Não foi possível retirar o participante."),
    };
  }

  revalidateChampionship(parsed.data.teamSlug, parsed.data.championshipId);
  return {
    attempt,
    outcome: "success",
    nextRequestId: randomUUID(),
    message: data.replayed
      ? "Este participante já estava retirado."
      : "Participante retirado. Resultados concluídos foram preservados.",
  };
}

function revalidateChampionship(teamSlug: string, championshipId: string) {
  revalidatePath(`/app/${teamSlug}/championships`);
  revalidatePath(`/app/${teamSlug}/championships/${championshipId}`);
}
