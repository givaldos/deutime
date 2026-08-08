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
  results,
}: {
  eventId: string;
  matchId: string;
  matchLabel: string;
  candidates: { id: string; name: string }[];
  closesLabel: string | null;
  alreadyVoted: boolean;
  closed: boolean;
  results: { id: string; name: string; votes: number; percentage: number }[];
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

  if (closed) {
    return (
      <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
            <Trophy className="size-6" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              {matchLabel}
            </p>
            <h2 className="mt-1 text-lg font-black text-amber-950">
              Resultado da galera
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              {results.length
                ? "A votação terminou. O resultado mostra somente totais agregados."
                : "A votação terminou sem votos computados."}
            </p>
          </div>
        </div>
        {results.length ? (
          <ol className="mt-5 space-y-3">
            {results.map((result) => (
              <li key={result.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-900">
                    {result.votes === results[0]?.votes ? "🏆 " : ""}
                    {result.name}
                  </span>
                  <span className="shrink-0 text-sm font-black text-amber-800">
                    {result.percentage.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}%
                  </span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100"
                  aria-hidden
                >
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${result.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {result.votes} {result.votes === 1 ? "voto" : "votos"}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    );
  }

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

  if (!candidates.length) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {matchLabel}
        </p>
        <h2 className="mt-1 font-black">
          Votação indisponível
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Ainda não há participantes elegíveis para receber votos.
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
