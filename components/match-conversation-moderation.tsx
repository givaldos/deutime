"use client";

import {
  hideMatchCommentAction,
  restoreMatchCommentAction,
  type ConversationModerationActionState,
} from "@/app/app/[teamSlug]/events/[eventId]/matches/conversation-actions";
import { Button } from "@/components/ui/button";
import type { MatchConversationModerationItem } from "@/lib/data/match-conversation-moderation";
import { EyeOff, Flag, RotateCcw, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

const initialState: ConversationModerationActionState = {};

function ModerationForm({
  item,
  eventId,
  teamSlug,
}: {
  item: MatchConversationModerationItem;
  eventId: string;
  teamSlug: string;
}) {
  const restoring = item.status === "moderated";
  const [state, action, pending] = useActionState(
    restoring ? restoreMatchCommentAction : hideMatchCommentAction,
    initialState,
  );

  return (
    <form action={action} className="mt-4 rounded-2xl bg-slate-50 p-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="commentId" value={item.commentId} />
      <label
        htmlFor={`moderation-reason-${item.commentId}`}
        className="text-xs font-bold text-slate-800"
      >
        {restoring ? "Motivo da restauração" : "Motivo da ocultação"}
      </label>
      <textarea
        id={`moderation-reason-${item.commentId}`}
        name="reason"
        required
        minLength={2}
        maxLength={500}
        rows={2}
        className="mt-2 min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-base leading-6 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
        placeholder={
          restoring
            ? "Explique por que o conteúdo pode voltar..."
            : "Explique por que o conteúdo será ocultado..."
        }
      />
      <Button
        type="submit"
        variant={restoring ? "outline" : "destructive"}
        size="sm"
        disabled={pending}
        className="mt-3 min-h-11 w-full sm:w-auto"
      >
        {restoring ? <RotateCcw aria-hidden /> : <EyeOff aria-hidden />}
        {pending
          ? "Salvando decisão..."
          : restoring
            ? "Restaurar comentário"
            : "Ocultar comentário"}
      </Button>
      {state.message ? (
        <p
          role={state.outcome === "success" ? "status" : "alert"}
          className={`mt-3 text-sm font-semibold ${
            state.outcome === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function MatchConversationModeration({
  items,
  eventId,
  teamSlug,
  timeZone,
}: {
  items: MatchConversationModerationItem[];
  eventId: string;
  teamSlug: string;
  timeZone: string;
}) {
  return (
    <section className="app-surface p-5 sm:p-6" aria-labelledby="moderation-title">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldCheck className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Privado · staff
              </p>
              <h2 id="moderation-title" className="mt-1 font-black">
                Moderação da conversa
              </h2>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Denúncias não ocultam mensagens automaticamente. Revise o contexto e
            registre o motivo de cada decisão.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
          <ShieldCheck className="mx-auto size-7 text-emerald-600" aria-hidden />
          <p className="mt-3 font-bold">Nenhuma revisão pendente</p>
          <p className="mt-1 text-sm text-slate-500">
            Comentários restaurados e denúncias encerradas saem desta fila.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <article
              key={item.commentId}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-emerald-700">
                    Partida {item.matchOrdinal}
                    {item.parentCommentId ? " · resposta" : " · comentário"}
                  </p>
                  <h3 className="mt-1 font-black text-slate-900">
                    {item.authorName}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  <Flag className="size-3.5" aria-hidden />
                  {item.reportCount} {item.reportCount === 1 ? "denúncia" : "denúncias"}
                </span>
              </div>
              <time
                dateTime={item.createdAt}
                className="mt-1 block text-xs text-slate-400"
              >
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone,
                }).format(new Date(item.createdAt))}
              </time>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-800">
                {item.body}
              </p>
              {item.moderationReason ? (
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  <strong>Ocultado por:</strong> {item.moderationReason}
                </p>
              ) : null}
              {item.reportReasons.length ? (
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-700">
                    Motivos recebidos
                  </p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    {item.reportReasons.map((reason, index) => (
                      <li key={`${item.commentId}-${index}`}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ModerationForm
                item={item}
                eventId={eventId}
                teamSlug={teamSlug}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
