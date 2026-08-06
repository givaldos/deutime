import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicMatchView = {
  id: string;
  ordinal: number;
  status: string;
  public_mode: string;
  sides: { label: string; side_index: number }[];
  events: { kind: string; side_index: number | null; minute: number | null }[];
};

// Projeção anônima: só retorna partidas com public_mode != 'private' e sem identidade.
// Quando flag event_matches desligada ou sem partidas públicas, retorna null/[] e fallback mantém página mínima.
export async function getPublicEventMatches(publicId: string): Promise<PublicMatchView[] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();
  const { data: event } = await supabase.from("public_event_directory").select("public_id").eq("public_id", publicId).maybeSingle();
  if (!event) return null;
  // tenta ler event_matches via public_id -> event_id; se tabela/coluna não existir (N-1), retorna null
  try {
    const { data: matches, error } = await supabase
      .from("event_matches")
      .select("id, ordinal, status, public_mode, event_id")
      .eq("public_mode", "live")
      .order("ordinal");
    if (error) return null;
    // filtra só do evento corrente via join manual (evita FK direta com public_id)
    // busca event_id real
    const { data: ev } = await supabase.from("events").select("id").eq("public_id", publicId).maybeSingle();
    if (!ev) return [];
    const filtered = (matches as { id: string; ordinal: number; status: string; public_mode: string; event_id: string }[]).filter((m) => m.event_id === ev.id && m.public_mode !== "private");
    if (filtered.length === 0) return [];
    const ids = filtered.map((m) => m.id);
    const { data: sides } = await supabase.from("match_sides").select("match_id, side_index, label").in("match_id", ids).order("side_index");
    const { data: events } = await supabase.from("match_events").select("match_id, kind, side_id, minute").in("match_id", ids).order("created_at");
    const sideByMatch = new Map<string, { label: string; side_index: number }[]>();
    for (const s of (sides as { match_id: string; side_index: number; label: string }[] | null) ?? []) {
      const arr = sideByMatch.get(s.match_id) ?? [];
      arr.push({ label: s.label, side_index: s.side_index });
      sideByMatch.set(s.match_id, arr);
    }
    // mapeia side_id -> side_index para eventos
    const sideIndexById = new Map<string, number>();
    for (const s of (sides as { match_id: string; side_index: number; label: string; id: string }[] | null) ?? []) sideIndexById.set((s as unknown as { id: string }).id, s.side_index);
    const eventByMatch = new Map<string, { kind: string; side_index: number | null; minute: number | null }[]>();
    for (const e of (events as { match_id: string; kind: string; side_id: string | null; minute: number | null }[] | null) ?? []) {
      const arr = eventByMatch.get(e.match_id) ?? [];
      arr.push({ kind: e.kind, side_index: e.side_id ? sideIndexById.get(e.side_id) ?? null : null, minute: e.minute });
      eventByMatch.set(e.match_id, arr);
    }
    return filtered.map((m) => ({
      id: m.id, ordinal: m.ordinal, status: m.status, public_mode: m.public_mode,
      sides: sideByMatch.get(m.id) ?? [],
      events: eventByMatch.get(m.id) ?? [],
    }));
  } catch {
    return null;
  }
}
