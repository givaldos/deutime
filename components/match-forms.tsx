"use client";
import { createMatchAction, recordEventAction, setParticipationAction } from "@/app/app/[teamSlug]/events/[eventId]/match/match-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useState } from "react";

export function CreateMatchForm({ teamSlug, eventId }: { teamSlug: string; eventId: string }) {
  const [state, action, pending] = useActionState(createMatchAction, {});
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="sideALabel">Time A</Label><Input id="sideALabel" name="sideALabel" placeholder="Time A" defaultValue="Time A" maxLength={60} /></div>
        <div><Label htmlFor="sideBLabel">Time B</Label><Input id="sideBLabel" name="sideBLabel" placeholder="Time B" defaultValue="Time B" maxLength={60} /></div>
      </div>
      <div><Label htmlFor="externalOpponentName">Adversário externo (opcional)</Label><Input id="externalOpponentName" name="externalOpponentName" placeholder="Ex: Unidos da Vila" maxLength={80} /></div>
      {state.message && <p className={`text-sm ${state.outcome === "success" ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full bg-emerald-700 hover:bg-emerald-800">{pending ? "Criando..." : "Nova partida"}</Button>
    </form>
  );
}

export function ParticipationForm({ teamSlug, matchId, athletes, sides }: { teamSlug: string; matchId: string; athletes: { id: string; name: string }[]; sides: { id: string; label: string; side_index: number }[] }) {
  const [state, action, pending] = useActionState(setParticipationAction, {});
  const [athleteId, setAthleteId] = useState(athletes[0]?.id ?? "");
  const [sideIndex, setSideIndex] = useState("1");
  if (!athletes.length) return <p className="text-sm text-slate-500">Sem atletas ativos para escalar.</p>;
  return (
    <form action={action} className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 p-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="matchId" value={matchId} />
      <select name="athleteId" value={athleteId} onChange={(e) => setAthleteId(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
        {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select name="sideIndex" value={sideIndex} onChange={(e) => setSideIndex(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
        {sides.map((s) => <option key={s.id} value={String(s.side_index)}>{s.label}</option>)}
      </select>
      <Button type="submit" disabled={pending} size="sm" className="bg-slate-800">{pending ? "..." : "Escalar"}</Button>
      {state.message && <p className="w-full text-xs text-slate-500">{state.message}</p>}
    </form>
  );
}

export function VoidMatchForm({ teamSlug, matchId, status }: { teamSlug: string; matchId: string; status: string }) {
  const [state, action, pending] = useActionState(async (_: unknown, fd: FormData) => {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { error } = await (supabase as unknown as { rpc: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }).rpc("void_event_match", { requested_match_id: fd.get("matchId") as string, requested_reason: fd.get("reason") as string });
    return { outcome: error ? "error" as const : "success" as const, message: error ? error.message : "Partida anulada." };
  }, {} as { outcome?: string; message?: string });
  if (status === "void") return <p className="text-xs text-slate-400">Partida anulada.</p>;
  return (
    <form action={action} className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="matchId" value={matchId} />
      <Input name="reason" placeholder="Motivo da anulação (3-500)" required minLength={3} maxLength={500} className="h-9 flex-1" />
      <Button type="submit" disabled={pending} size="sm" variant="outline" className="border-amber-300 text-amber-800">{pending ? "..." : "Anular"}</Button>
      {state.message && <span className="text-xs text-amber-800">{state.message}</span>}
    </form>
  );
}

export function FinalizeMatchForm({ teamSlug, matchId, status }: { teamSlug: string; matchId: string; status: string }) {
  const [state, action, pending] = useActionState(async (_: unknown, fd: FormData) => {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { error } = await (supabase as unknown as { rpc: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }).rpc("finalize_event_match", { requested_match_id: fd.get("matchId") as string });
    return { outcome: error ? "error" as const : "success" as const, message: error ? error.message : "Partida finalizada." };
  }, {} as { outcome?: string; message?: string });
  if (status === "finalized" || status === "void") return <p className="text-xs text-slate-400">Partida {status}.</p>;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="matchId" value={matchId} />
      <Button type="submit" disabled={pending} size="sm" className="bg-emerald-700">{pending ? "..." : "Encerrar partida"}</Button>
      {state.message && <span className="text-xs text-slate-500">{state.message}</span>}
    </form>
  );
}

export function PublicModeForm({ teamSlug, matchId, currentMode }: { teamSlug: string; matchId: string; currentMode: string }) {
  const [state, action, pending] = useActionState(async (_: unknown, fd: FormData) => {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { error } = await (supabase as unknown as { rpc: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }).rpc("set_match_public_mode", { requested_match_id: fd.get("matchId") as string, requested_mode: fd.get("mode") as string });
    return { outcome: error ? "error" as const : "success" as const, message: error ? error.message : `Modo ${fd.get("mode")} salvo.` };
  }, {} as { outcome?: string; message?: string });
  return (
    <form action={action} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="matchId" value={matchId} />
      <select name="mode" defaultValue={currentMode} className="h-9 rounded-xl border border-slate-200 px-3 text-sm">
        <option value="private">Privado</option>
        <option value="final_result">Só final</option>
        <option value="live">Ao vivo</option>
      </select>
      <Button type="submit" disabled={pending} size="sm" variant="outline">{pending ? "..." : "Publicar"}</Button>
      {state.message && <span className="text-xs text-slate-500">{state.message}</span>}
    </form>
  );
}

export function RecordEventForm({ teamSlug, matchId, sides, athletes }: { teamSlug: string; matchId: string; sides: { id: string; label: string; side_index: number }[]; athletes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(recordEventAction, {});
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="matchId" value={matchId} />
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Tipo</Label><select name="kind" defaultValue="goal" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="goal">Gol</option><option value="own_goal">Gol contra</option><option value="yellow_card">Amarelo</option><option value="red_card">Vermelho</option><option value="substitution">Substituição</option><option value="score_adjustment">Ajuste</option><option value="note">Nota</option></select></div>
        <div><Label>Lado</Label><select name="sideIndex" defaultValue="1" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">{sides.map((s) => <option key={s.id} value={String(s.side_index)}>{s.label}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Atleta (opcional)</Label><select name="athleteId" defaultValue="" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">—</option>{athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><Label>Minuto</Label><Input name="minute" type="number" min={0} max={300} placeholder="Ex: 23" /></div>
      </div>
      <div><Label>Notas</Label><Input name="notes" placeholder="Opcional" maxLength={500} /></div>
      {state.message && <p className={`text-sm ${state.outcome === "success" ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full bg-emerald-700">{pending ? "Registrando..." : "Registrar lance"}</Button>
    </form>
  );
}
