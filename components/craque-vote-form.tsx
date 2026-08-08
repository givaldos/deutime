"use client";

import {
  castCraqueVoteAction,
  type CraqueVoteActionState,
} from "@/app/me/agenda/[eventId]/actions";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

const initialState: CraqueVoteActionState = {};

export function CraqueVoteForm({
  eventId,
  matchId,
  matchLabel,
  candidates,
  closesLabel,
  alreadyVoted,
  closed,
}: {
  eventId: string;
  matchId: string;
  matchLabel: string;
  candidates: { id: string; name: string }[];
  closesLabel: string | null;
  alreadyVoted: boolean;
  closed: boolean;
}) {
  const [state, action, pending] = useActionState(
    castCraqueVoteAction,
    initialState,
  );
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? "");
  const voteConfirmed =
    alreadyVoted ||
    state.outcome === "success" ||
    state.outcome === "already_voted";

  if (voteConfirmed) {
    return (
      <section
        aria-live="polite"
        className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
            <BadgeCheck className="size-6" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {matchLabel}
            </p>
            <h2 className="mt-1 text-lg font-black text-emerald-950">
              Seu voto foi computado
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80">
              A confirmação não mostra sua escolha e o voto não pode ser alterado.
            </p>
          </div>
        </div>
        {state.receiptToken ? (
          <Button asChild variant="outline" className="mt-4 w-full border-emerald-300">
            <Link href={`/me/votos/recibo/${state.receiptToken}`}>
              Abrir recibo do voto
            </Link>
          </Button>
        ) : null}
      </section>
    );
  }

  if (closed || !candidates.length) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {matchLabel}
        </p>
        <h2 className="mt-1 font-black">
          {closed ? "Votação encerrada" : "Votação indisponível"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {closed
            ? "O resultado agregado será exibido quando a apuração estiver disponível."
            : "Ainda não há participantes elegíveis para receber votos."}
        </p>
      </section>
    );
  }

  return (
    <form
      action={action}
      className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="matchId" value={matchId} />
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <Trophy className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            {matchLabel}
          </p>
          <h2 className="mt-1 text-lg font-black text-amber-950">
            Quem foi o Craque da Galera?
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/80">
            Escolha quem mais brilhou. Você pode votar em si mesmo.
          </p>
        </div>
      </div>

      <fieldset className="mt-5 space-y-2">
        <legend className="sr-only">Escolha um participante</legend>
        {candidates.map((candidate) => (
          <label
            key={candidate.id}
            className="flex min-h-14 touch-manipulation items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition has-[:checked]:border-amber-600 has-[:checked]:bg-amber-100 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-amber-500/20"
          >
            <input
              type="radio"
              name="candidateAthleteId"
              value={candidate.id}
              checked={candidateId === candidate.id}
              onChange={() => setCandidateId(candidate.id)}
              className="size-5 accent-amber-600"
            />
            <span>{candidate.name}</span>
          </label>
        ))}
      </fieldset>

      {state.message ? (
        <p
          role={state.outcome === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl p-3 text-sm font-medium ${
            state.outcome === "error"
              ? "bg-red-50 text-red-700"
              : "bg-white text-amber-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || !candidateId}
        className="mt-4 h-12 w-full bg-amber-600 hover:bg-amber-700"
      >
        {pending ? "Computando voto..." : "Confirmar meu voto"}
      </Button>
      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-amber-900/75">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Voto único e anônimo. Sua escolha não aparece no recibo.
          {closesLabel ? ` Votação aberta até ${closesLabel}.` : ""}
        </span>
      </div>
    </form>
  );
}
