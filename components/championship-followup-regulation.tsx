import {
  ReopenChampionshipRegulationControl,
} from "@/components/championship-forms";
import { ChampionshipPublicControls } from "@/components/championship-public-controls";
import {
  ChampionshipFollowupShell,
  type ChampionshipIdentity,
} from "@/components/championship-followup-summary";
import type { ChampionshipFollowupRegulation } from "@/lib/data/championship-followup";
import {
  championshipFormatLabels,
  championshipTiebreakLabels,
} from "@/lib/features/championships/rules";

type Props = {
  teamId: string;
  teamSlug: string;
  returnTo: string | null;
  championship: ChampionshipIdentity;
  regulation: ChampionshipFollowupRegulation;
  canConfigure: boolean;
  professionalSchedulingEnabled: boolean;
  publicUrl: string;
};

export function ChampionshipRegulationView({
  teamId,
  teamSlug,
  returnTo,
  championship,
  regulation,
  canConfigure,
  professionalSchedulingEnabled,
  publicUrl,
}: Props) {
  const canReopen = canConfigure
    && professionalSchedulingEnabled
    && regulation.status !== "completed"
    && regulation.status !== "archived";

  return (
    <ChampionshipFollowupShell
      teamSlug={teamSlug}
      returnTo={returnTo}
      championship={championship}
      currentSection="regulation"
    >
      <div className="space-y-5">
        <section className="app-surface p-5 sm:p-7" aria-labelledby="regulation-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="app-kicker">Regra vigente</p>
              <h2 id="regulation-title" className="mt-1 text-2xl font-black text-graphite">
                Regulamento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {championshipFormatLabels[regulation.format]}
                {regulation.group_count
                  ? ` · ${regulation.group_count} grupos · ${regulation.qualifiers_per_group} classificados por grupo`
                  : ""}
              </p>
            </div>
            {regulation.current_version_number ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                Versão {regulation.current_version_number}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              [regulation.win_points, "Vitória"],
              [regulation.draw_points, "Empate"],
              [regulation.loss_points, "Derrota"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="font-black text-graphite">{value} pt</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-black text-graphite">Ordem de desempate</h3>
            <ol className="mt-2 space-y-2">
              {regulation.tiebreak_order.map((key, index) => (
                <li key={key} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700">
                  <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-emerald-700">
                    {index + 1}
                  </span>
                  {championshipTiebreakLabels[key]}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Pontos são o critério principal. Confronto direto considera o mini-torneio das equipes que continuarem empatadas nessa etapa.
            </p>
          </div>

          {regulation.version_count > 1 ? (
            <p className="mt-4 text-xs font-bold text-slate-500">
              {regulation.version_count} versões preservadas no histórico.
            </p>
          ) : null}
        </section>

        {canReopen ? (
          <section className="app-surface p-5 sm:p-7" aria-labelledby="regulation-edit-title">
            <p className="app-kicker">Alteração protegida</p>
            <h2 id="regulation-edit-title" className="mt-1 text-xl font-black text-graphite">
              Editar regulamento
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A edição reabre a configuração somente quando ainda não existe fato esportivo. A versão publicada permanece auditável.
            </p>
            <div className="mt-5">
              <ReopenChampionshipRegulationControl
                teamId={teamId}
                teamSlug={teamSlug}
                championshipId={regulation.id}
              />
            </div>
          </section>
        ) : null}

        {canConfigure ? (
          <ChampionshipPublicControls
            teamId={teamId}
            teamSlug={teamSlug}
            championshipId={regulation.id}
            publicId={regulation.public_id}
            publicMode={regulation.public_mode}
            publicUrl={publicUrl}
            championshipName={regulation.name}
          />
        ) : (
          <p className="app-surface p-4 text-sm text-slate-600">
            Você pode consultar o regulamento. Alterações e publicação ficam disponíveis para owner ou admin.
          </p>
        )}
      </div>
    </ChampionshipFollowupShell>
  );
}
