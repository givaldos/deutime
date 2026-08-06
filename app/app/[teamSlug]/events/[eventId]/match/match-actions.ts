"use server";
import { requireUser } from "@/lib/auth/dal";
import { isEventMatchesEnabled } from "@/lib/features/match/server";
import { createMatchSchema, matchEventSchema, matchParticipationSchema } from "@/lib/features/match/validation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MatchActionState = { outcome?: "success" | "error"; message?: string; errors?: Record<string, string[] | undefined> };

async function ensureFlag(teamId: string) {
  if (!(await isEventMatchesEnabled(teamId))) return { ok:false as const, message:"Recurso de partidas ainda não habilitado para este time." };
  return { ok:true as const };
}

export async function createMatchAction(_: MatchActionState, formData: FormData): Promise<MatchActionState> {
  await requireUser();
  const parsed = createMatchSchema.safeParse({
    eventId: formData.get("eventId"), teamSlug: formData.get("teamSlug"),
    ordinal: formData.get("ordinal") || undefined,
    sideALabel: formData.get("sideALabel") || undefined,
    sideBLabel: formData.get("sideBLabel") || undefined,
    externalOpponentName: formData.get("externalOpponentName") || undefined,
  });
  if (!parsed.success) return { outcome:"error", message:"Revise os dados da partida.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id").eq("slug", parsed.data.teamSlug).maybeSingle();
  if (!team) return { outcome:"error", message:"Time não encontrado." };
  const flag = await ensureFlag(team.id);
  if (!flag.ok) return { outcome:"error", message: flag.message };
  const { error } = await (supabase as unknown as { rpc: (a: string, b: unknown) => Promise<{ error: { code?: string; message: string } | null }> }).rpc("create_event_match", {
    requested_event_id: parsed.data.eventId,
    requested_ordinal: parsed.data.ordinal ?? null,
    requested_side_a_label: parsed.data.sideALabel ?? null,
    requested_side_b_label: parsed.data.sideBLabel ?? null,
    requested_external_opponent_name: parsed.data.externalOpponentName ?? null,
  });
  if (error) return { outcome:"error", message: error.code === "42501" ? "Sem permissão." : error.message };
  revalidatePath(`/app/${parsed.data.teamSlug}/events/${parsed.data.eventId}/match`);
  return { outcome:"success", message:"Partida criada." };
}

export async function setParticipationAction(_: MatchActionState, formData: FormData): Promise<MatchActionState> {
  await requireUser();
  const parsed = matchParticipationSchema.safeParse({
    matchId: formData.get("matchId"), teamSlug: formData.get("teamSlug"),
    athleteId: formData.get("athleteId"), sideIndex: formData.get("sideIndex"),
  });
  if (!parsed.success) return { outcome:"error", message:"Revise a escalação.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id").eq("slug", parsed.data.teamSlug).maybeSingle();
  if (!team) return { outcome:"error", message:"Time não encontrado." };
  const flag = await ensureFlag(team.id);
  if (!flag.ok) return { outcome:"error", message: flag.message };
  const { error } = await (supabase as unknown as { rpc: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }).rpc("set_match_participation", {
    requested_match_id: parsed.data.matchId,
    requested_athlete_id: parsed.data.athleteId,
    requested_side_index: parsed.data.sideIndex,
  });
  if (error) return { outcome:"error", message: error.message };
  revalidatePath(`/app/${parsed.data.teamSlug}/events/${parsed.data.matchId}/match`);
  return { outcome:"success", message:"Participação registrada." };
}

export async function recordEventAction(_: MatchActionState, formData: FormData): Promise<MatchActionState> {
  await requireUser();
  const parsed = matchEventSchema.safeParse({
    matchId: formData.get("matchId"), teamSlug: formData.get("teamSlug"),
    kind: formData.get("kind"), sideIndex: formData.get("sideIndex") || undefined,
    athleteId: formData.get("athleteId") || undefined,
    assistAthleteId: formData.get("assistAthleteId") || undefined,
    minute: formData.get("minute") || undefined,
    delta: formData.get("delta") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { outcome:"error", message:"Revise o lance.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id").eq("slug", parsed.data.teamSlug).maybeSingle();
  if (!team) return { outcome:"error", message:"Time não encontrado." };
  const flag = await ensureFlag(team.id);
  if (!flag.ok) return { outcome:"error", message: flag.message };
  const { error } = await (supabase as unknown as { rpc: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }).rpc("record_match_event", {
    requested_match_id: parsed.data.matchId,
    requested_kind: parsed.data.kind as unknown as never,
    requested_side_index: parsed.data.sideIndex ?? null,
    requested_athlete_id: parsed.data.athleteId ?? null,
    requested_assist_athlete_id: parsed.data.assistAthleteId ?? null,
    requested_minute: parsed.data.minute ?? null,
    requested_delta: parsed.data.delta ?? null,
    requested_notes: parsed.data.notes ?? null,
  });
  if (error) return { outcome:"error", message: error.message };
  revalidatePath(`/app/${parsed.data.teamSlug}/events/${parsed.data.matchId}/match`);
  return { outcome:"success", message:"Lance registrado." };
}
