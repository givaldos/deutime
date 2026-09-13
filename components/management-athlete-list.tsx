"use client";

import {
  reviewAthlete,
  setAthleteAvailability,
} from "@/app/app/[teamSlug]/athletes/actions";
import { AthleteRemoveButton } from "@/components/athlete-remove-button";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { Button } from "@/components/ui/button";
import type { ManagementAthleteItem } from "@/lib/data/management-athletes";
import {
  Ban,
  Check,
  Edit3,
  LayoutGrid,
  List,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

type RosterView = "cards" | "list";

const storageKey = "deutime:management-athletes:view";
const storageEvent = "deutime:management-athletes:view-change";

const statusLabels = {
  active: "Em atividade",
  inactive: "Inativo",
  pending: "Aguardando aprovação",
  rejected: "Não aprovado",
} as const;

function getStoredView(): RosterView {
  try {
    return window.localStorage.getItem(storageKey) === "list" ? "list" : "cards";
  } catch {
    return "cards";
  }
}

function subscribeToView(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(storageEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageEvent, callback);
  };
}

function useRosterView() {
  const view = useSyncExternalStore(subscribeToView, getStoredView, () => "cards");
  const setView = (next: RosterView) => {
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // A preferência visual é opcional e nunca bloqueia o elenco.
    }
    window.dispatchEvent(new Event(storageEvent));
  };
  return [view, setView] as const;
}

function AthletePhoto({ athlete, compact = false }: {
  athlete: ManagementAthleteItem;
  compact?: boolean;
}) {
  const initials = athlete.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className={`${compact ? "size-14 rounded-2xl" : "aspect-[4/3] w-full rounded-t-2xl"} relative grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-emerald-100 to-slate-200`}>
      {athlete.photo_url ? (
        <Image
          src={athlete.photo_url}
          alt={`Foto de ${athlete.display_name}`}
          fill
          sizes={compact ? "56px" : "(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden className={`${compact ? "text-lg" : "text-4xl"} font-black text-emerald-900/35`}>
          {initials || <UserRound className="size-6" />}
        </span>
      )}
    </div>
  );
}

function AthleteSummary({ athlete }: { athlete: ManagementAthleteItem }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="truncate font-black text-graphite">{athlete.display_name}</h3>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${athlete.status === "active" ? "bg-emerald-50 text-emerald-800" : athlete.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>
          {statusLabels[athlete.status]}
        </span>
      </div>
      {athlete.full_name !== athlete.display_name ? (
        <p className="mt-1 truncate text-xs text-slate-500">{athlete.full_name}</p>
      ) : null}
      <p className="mt-2 text-xs font-semibold text-slate-500">
        BID #{athlete.registration_number}
        {athlete.shirt_number ? ` · camisa ${athlete.shirt_number}` : ""}
        {athlete.claimed ? " · perfil confirmado" : ""}
      </p>
      {athlete.positions.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {athlete.positions.map((position, index) => (
            <span key={`${position.sport_format}-${position.code}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {index + 1}. {position.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AthleteActions({ athlete, teamSlug }: {
  athlete: ManagementAthleteItem;
  teamSlug: string;
}) {
  if (athlete.allowed_actions.can_review) {
    return (
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
        <form action={reviewAthlete}>
          <input type="hidden" name="athleteId" value={athlete.id} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="decision" value="reject" />
          <AsyncSubmitButton pendingLabel="Rejeitando..." variant="outline" className="min-h-11 w-full rounded-xl">
            <X aria-hidden /> Rejeitar
          </AsyncSubmitButton>
        </form>
        <form action={reviewAthlete}>
          <input type="hidden" name="athleteId" value={athlete.id} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="decision" value="approve" />
          <AsyncSubmitButton pendingLabel="Confirmando..." className="min-h-11 w-full rounded-xl">
            <Check aria-hidden /> Aprovar
          </AsyncSubmitButton>
        </form>
      </div>
    );
  }

  if (!athlete.allowed_actions.can_edit && !athlete.allowed_actions.can_remove) {
    return null;
  }

  const canToggle = athlete.status === "active" || athlete.status === "inactive";
  return (
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <div className="grid grid-cols-2 gap-2">
        {athlete.allowed_actions.can_edit ? (
          <Button asChild size="sm" variant="outline" className="min-h-11 rounded-xl">
            <Link href={`/app/${teamSlug}/athletes/${athlete.id}/edit`}>
              <Edit3 aria-hidden /> Editar
            </Link>
          </Button>
        ) : <span />}
        {athlete.allowed_actions.can_remove ? (
          <AthleteRemoveButton athleteId={athlete.id} athleteName={athlete.display_name} teamSlug={teamSlug} />
        ) : null}
      </div>
      {canToggle && athlete.allowed_actions.can_edit ? (
        <form action={setAthleteAvailability}>
          <input type="hidden" name="athleteId" value={athlete.id} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="status" value={athlete.status === "active" ? "inactive" : "active"} />
          <AsyncSubmitButton pendingLabel="Atualizando..." size="sm" variant="ghost" className="min-h-11 w-full rounded-xl text-slate-600">
            {athlete.status === "active" ? <><Ban aria-hidden /> Marcar como inativo</> : <><RotateCcw aria-hidden /> Reativar atleta</>}
          </AsyncSubmitButton>
        </form>
      ) : null}
    </div>
  );
}

export function ManagementAthleteList({ athletes, teamSlug }: {
  athletes: ManagementAthleteItem[];
  teamSlug: string;
}) {
  const [view, setView] = useRosterView();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <div role="group" aria-label="Apresentação do elenco" className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${view === "list" ? "bg-grass text-white" : "text-slate-600 hover:text-emerald-800"}`}>
            <List className="size-4" aria-hidden /> Lista
          </button>
          <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${view === "cards" ? "bg-grass text-white" : "text-slate-600 hover:text-emerald-800"}`}>
            <LayoutGrid className="size-4" aria-hidden /> Cartões
          </button>
        </div>
      </div>

      <div data-roster-view={view} className={view === "cards" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
        {athletes.map((athlete) => (
          <article key={athlete.id} className="app-surface overflow-hidden">
            {view === "cards" ? (
              <>
                <AthletePhoto athlete={athlete} />
                <div className="space-y-4 p-4">
                  <AthleteSummary athlete={athlete} />
                  <AthleteActions athlete={athlete} teamSlug={teamSlug} />
                </div>
              </>
            ) : (
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <AthletePhoto athlete={athlete} compact />
                  <AthleteSummary athlete={athlete} />
                </div>
                <AthleteActions athlete={athlete} teamSlug={teamSlug} />
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
