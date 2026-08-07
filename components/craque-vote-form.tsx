"use client";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";

export function CraqueVoteForm({ matchId, candidates }: { matchId: string; candidates: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(async (_: unknown, fd: FormData) => {
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const candidateId = fd.get("candidateId") as string;
    const voterHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(candidateId + matchId + Date.now())).then(b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""));
    const receiptHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(matchId + voterHash)).then(b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""));
    const { error } = await (supabase as unknown as { rpc: (a:string,b:unknown)=>Promise<{error:{message:string}|null}> }).rpc("cast_craque_vote", { requested_match_id: matchId, requested_candidate_athlete_id: candidateId, requested_voter_hash: voterHash, requested_receipt_hash: receiptHash });
    return { outcome: error ? "error" as const : "success" as const, message: error ? error.message : "Voto computado (recibo 7d)." };
  }, {} as { outcome?: string; message?: string });
  if (!candidates.length) return <p className="text-sm text-slate-500">Sem candidatos — só quem participou pode ser votado.</p>;
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="font-bold">Craque da Galera</h3>
      <select name="candidateId" defaultValue={candidates[0]?.id} className="h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-sm">
        {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button type="submit" disabled={pending} className="w-full bg-amber-600 hover:bg-amber-700">{pending ? "..." : "Votar (anônimo)"}</Button>
      {state.message && <p className={`text-sm ${state.outcome==="success"?"text-emerald-700":"text-red-600"}`}>{state.message}</p>}
      <p className="text-xs text-amber-800">Voto único por partida, janela ≤12h após finalizada, recibo opaco 7 dias.</p>
    </form>
  );
}
