"use server";

import { requireUser } from "@/lib/auth/dal";
import { isChampionshipsEnabled } from "@/lib/features/championships/server";
import { createClient } from "@/lib/supabase/server";
import {
  addChampionshipParticipantSchema,
  championshipCommandSchema,
  createChampionshipSchema,
  linkChampionshipFixtureSchema,
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
    winPoints: formData.get("winPoints"),
    drawPoints: formData.get("drawPoints"),
    lossPoints: formData.get("lossPoints"),
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
    requested_format: "league",
    requested_win_points: parsed.data.winPoints,
    requested_draw_points: parsed.data.drawPoints,
    requested_loss_points: parsed.data.lossPoints,
    requested_tiebreak_order: parsed.data.tiebreakOrder,
    requested_group_count: undefined,
    requested_qualifiers_per_group: undefined,
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
    requested_group_number: null as never,
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

export async function publishLeagueChampionship(
  previousState: ChampionshipActionState,
  formData: FormData,
): Promise<ChampionshipActionState> {
  return runChampionshipCommand(previousState, formData, "publish");
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

function revalidateChampionship(teamSlug: string, championshipId: string) {
  revalidatePath(`/app/${teamSlug}/championships`);
  revalidatePath(`/app/${teamSlug}/championships/${championshipId}`);
}
