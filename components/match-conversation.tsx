"use client";

import {
  createMatchCommentAction,
  deleteMatchCommentAction,
  reportMatchCommentAction,
  type MatchConversationActionState,
} from "@/app/me/agenda/[eventId]/actions";
import { Button } from "@/components/ui/button";
import type {
  MatchConversation as MatchConversationData,
  MatchConversationComment,
} from "@/lib/data/match-conversation";
import {
  Clock3,
  Flag,
  MessageCircle,
  Reply,
  Send,
  Trash2,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

const initialState: MatchConversationActionState = {};

function CommentComposer({
  eventId,
  matchId,
  requestId,
  parentCommentId,
  compact = false,
}: {
  eventId: string;
  matchId: string;
  requestId: string;
  parentCommentId?: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(
    createMatchCommentAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.outcome === "success") formRef.current?.reset();
  }, [state.outcome]);

  return (
    <form
      ref={formRef}
      action={action}
      className={compact ? "mt-3" : "mt-5"}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="idempotencyKey" value={requestId} />
      {parentCommentId ? (
        <input
          type="hidden"
          name="parentCommentId"
          value={parentCommentId}
        />
      ) : null}
      <label
        htmlFor={`comment-${requestId}`}
        className="text-sm font-bold text-slate-800"
      >
        {parentCommentId ? "Sua resposta" : "Escreva para o time"}
      </label>
      <textarea
        id={`comment-${requestId}`}
        name="body"
        required
        minLength={1}
        maxLength={1000}
        rows={compact ? 2 : 3}
        placeholder={
          parentCommentId
            ? "Responda com respeito..."
            : "Como foi a partida?"
        }
        className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-slate-500">
          Texto simples, sem links. Até 1.000 caracteres.
        </p>
        <Button type="submit" size="sm" disabled={pending} className="min-h-11">
          <Send aria-hidden />
          {pending ? "Enviando..." : parentCommentId ? "Responder" : "Publicar"}
        </Button>
      </div>
      {state.message ? (
        <p
          role={state.outcome === "success" ? "status" : "alert"}
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
            state.outcome === "success"
              ? "bg-emerald-100 text-emerald-900"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function DeleteCommentForm({
  eventId,
  commentId,
}: {
  eventId: string;
  commentId: string;
}) {
  const [state, action, pending] = useActionState(
    deleteMatchCommentAction,
    initialState,
  );

  return (
    <form action={action} className="inline-flex flex-col items-end">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="commentId" value={commentId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="min-h-11 text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        <Trash2 aria-hidden />
        {pending ? "Removendo..." : "Remover"}
      </Button>
      {state.message && state.outcome !== "success" ? (
        <span role="alert" className="mt-1 text-xs text-red-700">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function ReportCommentForm({
  eventId,
  commentId,
}: {
  eventId: string;
  commentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    reportMatchCommentAction,
    initialState,
  );

  if (state.outcome === "success") {
    return (
      <p role="status" className="text-xs font-semibold text-emerald-700">
        Denúncia enviada
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="min-h-11 text-slate-500"
      >
        <Flag aria-hidden /> Denunciar
      </Button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full rounded-2xl bg-slate-50 p-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="commentId" value={commentId} />
      <label htmlFor={`report-${commentId}`} className="text-xs font-bold">
        Por que esta mensagem precisa de revisão?
      </label>
      <textarea
        id={`report-${commentId}`}
        name="reason"
        required
        minLength={2}
        maxLength={500}
        rows={2}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="min-h-11"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending}
          className="min-h-11"
        >
          <Flag aria-hidden /> {pending ? "Enviando..." : "Enviar denúncia"}
        </Button>
      </div>
      {state.message ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function CommentCard({
  eventId,
  matchId,
  comment,
  replies,
  writable,
  replyRequestId,
  timeZone,
}: {
  eventId: string;
  matchId: string;
  comment: MatchConversationComment;
  replies: MatchConversationComment[];
  writable: boolean;
  replyRequestId: string;
  timeZone: string;
}) {
  const [replying, setReplying] = useState(false);
  const active = comment.status === "active";
  const formattedTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(new Date(comment.createdAt));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            {comment.authorName}
          </h3>
          <time className="text-xs text-slate-400" dateTime={comment.createdAt}>
            {formattedTime}
          </time>
        </div>
        {active && comment.canDelete ? (
          <DeleteCommentForm eventId={eventId} commentId={comment.id} />
        ) : null}
      </div>
      {active ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {comment.body}
        </p>
      ) : (
        <p className="mt-3 text-sm italic text-slate-500">
          {comment.status === "author_deleted"
            ? "Comentário removido"
            : "Comentário ocultado pela moderação"}
        </p>
      )}

      {active ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {writable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReplying((value) => !value)}
              className="min-h-11"
            >
              <Reply aria-hidden /> {replying ? "Fechar resposta" : "Responder"}
            </Button>
          ) : null}
          {!comment.canDelete ? (
            <ReportCommentForm eventId={eventId} commentId={comment.id} />
          ) : null}
        </div>
      ) : null}

      {replying && writable ? (
        <CommentComposer
          eventId={eventId}
          matchId={matchId}
          requestId={replyRequestId}
          parentCommentId={comment.id}
          compact
        />
      ) : null}

      {replies.length ? (
        <div className="mt-4 space-y-3 border-l-2 border-emerald-100 pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {reply.authorName}
                  </p>
                  <time
                    className="text-[11px] text-slate-400"
                    dateTime={reply.createdAt}
                  >
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone,
                    }).format(new Date(reply.createdAt))}
                  </time>
                </div>
                {reply.status === "active" && reply.canDelete ? (
                  <DeleteCommentForm eventId={eventId} commentId={reply.id} />
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {reply.status === "active"
                  ? reply.body
                  : reply.status === "author_deleted"
                    ? "Comentário removido"
                    : "Comentário ocultado pela moderação"}
              </p>
              {reply.status === "active" && !reply.canDelete ? (
                <div className="mt-1">
                  <ReportCommentForm eventId={eventId} commentId={reply.id} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function MatchConversation({
  eventId,
  conversation,
  timeZone,
  rootRequestId,
  replyRequestIds,
}: {
  eventId: string;
  conversation: MatchConversationData;
  timeZone: string;
  rootRequestId: string;
  replyRequestIds: Record<string, string>;
}) {
  const roots = conversation.comments.filter((comment) => !comment.parentId);
  const repliesByRoot = new Map<string, MatchConversationComment[]>();
  for (const comment of conversation.comments) {
    if (!comment.parentId) continue;
    const replies = repliesByRoot.get(comment.parentId) ?? [];
    replies.push(comment);
    repliesByRoot.set(comment.parentId, replies);
  }
  const closesLabel = conversation.closesAt
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone,
      }).format(new Date(conversation.closesAt))
    : null;

  return (
    <section
      aria-labelledby={`conversation-${conversation.matchId}`}
      className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
          <MessageCircle className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Partida {conversation.ordinal}
          </p>
          <h2
            id={`conversation-${conversation.matchId}`}
            className="mt-1 text-xl font-black text-emerald-950"
          >
            Conversa da súmula
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/75">
            Espaço privado para quem participou e para a equipe do time.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-emerald-900/75">
        <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {conversation.writable
            ? closesLabel
              ? `Novas mensagens até ${closesLabel}.`
              : "A conversa está aberta."
            : "A janela de mensagens terminou. A conversa continua disponível para leitura."}
        </span>
      </div>

      {roots.length ? (
        <div className="mt-5 space-y-3">
          {roots.map((comment) => (
            <CommentCard
              key={comment.id}
              eventId={eventId}
              matchId={conversation.matchId}
              comment={comment}
              replies={repliesByRoot.get(comment.id) ?? []}
              writable={conversation.writable}
              replyRequestId={replyRequestIds[comment.id] ?? rootRequestId}
              timeZone={timeZone}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-white/60 p-5 text-center">
          <p className="font-bold text-emerald-950">A conversa está vazia</p>
          <p className="mt-1 text-sm text-emerald-900/70">
            Seja a primeira pessoa a comentar sobre a partida.
          </p>
        </div>
      )}

      {conversation.writable ? (
        <CommentComposer
          eventId={eventId}
          matchId={conversation.matchId}
          requestId={rootRequestId}
        />
      ) : null}
    </section>
  );
}
