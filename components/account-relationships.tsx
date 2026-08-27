import {
  closeMyAccount,
  closeMyTeam,
  declineMyTeamInvitation,
  leaveMyTeam,
  transferMyTeamOwnership,
  withdrawMyTeamRequest,
} from "@/app/me/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/turnstile-widget";
import type { Database } from "@/lib/database.types";
import { ShieldAlert, UserRoundX, UsersRound } from "lucide-react";

type Relationship =
  Database["public"]["Functions"]["list_my_account_relationships"]["Returns"][number];
type Candidate =
  Database["public"]["Functions"]["list_my_owner_transfer_candidates"]["Returns"][number];

const statusLabel: Record<string, string> = {
  active: "Ativo",
  pending: "Aguardando aprovação",
  invited: "Convidado",
  suspended: "Suspenso",
  inactive: "Inativo",
  rejected: "Não aprovado",
};

export function AccountRelationships({
  relationships,
  candidatesByTeam,
  enabled,
  feedback,
  hasPassword,
  siteKey,
  nonce,
}: {
  relationships: Relationship[];
  candidatesByTeam: Record<string, Candidate[]>;
  enabled: boolean;
  feedback?: string;
  hasPassword: boolean;
  siteKey?: string;
  nonce?: string;
}) {
  const teams = new Map<string, Relationship[]>();
  for (const relationship of relationships) {
    const current = teams.get(relationship.team_id) ?? [];
    current.push(relationship);
    teams.set(relationship.team_id, current);
  }
  const feedbackMessage = feedback ? lifecycleFeedback[feedback] : undefined;

  return (
    <section id="vinculos" className="app-surface scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Autonomia
          </p>
          <h2 className="mt-1 text-xl font-bold">Vínculos e conta</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Acompanhe pedidos, convites e acessos. Uma saída afeta somente o
            time escolhido e mantém as súmulas já encerradas sem sua identidade.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {relationships.length}
        </span>
      </div>

      {feedbackMessage ? (
        <p
          role="status"
          className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
            feedbackMessage.error
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {feedbackMessage.message}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {[...teams.entries()].map(([teamId, items]) => {
          const representative = items[0];
          if (!representative) return null;
          const invitation = items.find(
            (item) => item.relationship_kind === "invitation",
          );
          const pendingAthlete = items.find(
            (item) =>
              item.relationship_kind === "athlete" &&
              item.relationship_status === "pending",
          );
          const active = items.some(
            (item) => item.relationship_status === "active",
          );
          const lastOwner = items.some((item) => item.is_last_owner);
          const candidates = candidatesByTeam[teamId] ?? [];

          return (
            <article key={teamId} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <UsersRound className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{representative.team_name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <span
                        key={`${item.relationship_kind}-${item.relationship_id}`}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {relationshipLabel(item)} ·{" "}
                        {statusLabel[item.relationship_status] ?? item.relationship_status}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {enabled ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {pendingAthlete ? (
                    <form action={withdrawMyTeamRequest}>
                      <input type="hidden" name="relationshipId" value={pendingAthlete.relationship_id} />
                      <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                      <Button type="submit" variant="outline" size="sm">
                        Retirar pedido
                      </Button>
                    </form>
                  ) : null}
                  {invitation ? (
                    <form action={declineMyTeamInvitation}>
                      <input type="hidden" name="relationshipId" value={invitation.relationship_id} />
                      <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                      <Button type="submit" variant="outline" size="sm">
                        Recusar convite
                      </Button>
                    </form>
                  ) : null}
                  {active && !lastOwner ? (
                    <form action={leaveMyTeam}>
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                      <Button type="submit" variant="outline" size="sm">
                        Sair deste time
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : null}

              {enabled && lastOwner ? (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-bold">Você é o último proprietário.</p>
                  <p className="mt-1 leading-6">
                    Transfira a propriedade para um membro ativo ou encerre o
                    time antes de sair.
                  </p>
                  {candidates.length ? (
                    <form action={transferMyTeamOwnership} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                      <Label htmlFor={`next-owner-${teamId}`} className="sr-only">
                        Novo proprietário
                      </Label>
                      <select
                        id={`next-owner-${teamId}`}
                        name="nextOwnerId"
                        required
                        className="h-11 min-w-0 rounded-xl border border-amber-200 bg-white px-3 text-sm"
                      >
                        <option value="">Escolha um membro ativo</option>
                        {candidates.map((candidate) => (
                          <option key={candidate.user_id} value={candidate.user_id}>
                            {candidate.display_name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm">Transferir</Button>
                    </form>
                  ) : null}
                  <details className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
                    <summary className="cursor-pointer font-bold">Encerrar este time</summary>
                    <form action={closeMyTeam} className="mt-3 space-y-3">
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                      <div className="space-y-1.5">
                        <Label htmlFor={`team-name-${teamId}`}>Digite {representative.team_name}</Label>
                        <Input id={`team-name-${teamId}`} name="confirmation" required autoComplete="off" />
                      </div>
                      {hasPassword ? (
                        <div className="space-y-1.5">
                          <Label htmlFor={`team-password-${teamId}`}>Senha atual</Label>
                          <Input id={`team-password-${teamId}`} name="password" type="password" required autoComplete="current-password" />
                        </div>
                      ) : (
                        <FreshSessionNotice />
                      )}
                      <TurnstileWidget siteKey={siteKey} nonce={nonce} action="close_team" />
                      <Button type="submit" variant="destructive" size="sm">Confirmar encerramento</Button>
                    </form>
                  </details>
                </div>
              ) : null}
            </article>
          );
        })}
        {!relationships.length ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Nenhum vínculo, pedido ou convite aberto nesta conta.
          </p>
        ) : null}
      </div>

      {enabled ? (
        <details className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-3 font-bold text-red-950">
            <UserRoundX className="size-5" aria-hidden /> Encerrar minha conta
          </summary>
          <div className="mt-3 text-sm leading-6 text-red-900">
            <p>
              O acesso e a exposição pública são removidos imediatamente. Dados
              operacionais são minimizados e fatos esportivos encerrados ficam
              apenas como histórico anônimo. Backups expiram em até 30 dias.
            </p>
            <form action={closeMyAccount} className="mt-4 space-y-3">
              <input type="hidden" name="requestId" value={crypto.randomUUID()} />
              <div className="space-y-1.5">
                <Label htmlFor="account-confirmation">Digite ENCERRAR</Label>
                <Input id="account-confirmation" name="confirmation" required autoComplete="off" />
              </div>
              {hasPassword ? (
                <div className="space-y-1.5">
                  <Label htmlFor="account-password">Senha atual</Label>
                  <Input id="account-password" name="password" type="password" required autoComplete="current-password" />
                </div>
              ) : (
                <FreshSessionNotice />
              )}
              <TurnstileWidget siteKey={siteKey} nonce={nonce} action="close_account" />
              <Button type="submit" variant="destructive">Encerrar minha conta</Button>
            </form>
          </div>
        </details>
      ) : (
        <div className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>As ações de autonomia estão temporariamente indisponíveis. Seus vínculos continuam visíveis.</p>
        </div>
      )}
    </section>
  );
}

function relationshipLabel(item: Relationship) {
  if (item.relationship_kind === "invitation") return "Convite";
  if (item.relationship_kind === "athlete") return "Atleta";
  return item.relationship_role === "owner"
    ? "Proprietário"
    : item.relationship_role === "admin"
      ? "Administrador"
      : "Gestor";
}

function FreshSessionNotice() {
  return (
    <p className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
      Esta conta usa acesso sem senha. Por segurança, saia e entre novamente
      com o código verificado antes de confirmar.
    </p>
  );
}

const lifecycleFeedback: Record<string, { message: string; error?: boolean }> = {
  withdrawn: { message: "Pedido retirado. Esse acesso não pode mais ser aprovado." },
  declined: { message: "Convite recusado e invalidado." },
  left: { message: "Vínculo encerrado somente neste time." },
  transferred: { message: "Propriedade transferida. Agora você pode sair do time." },
  "team-closed": { message: "Time encerrado e retirado das páginas públicas." },
  "last-owner": { message: "Resolva os times em que você é o último proprietário antes de continuar.", error: true },
  reauthentication: { message: "Não foi possível confirmar sua identidade. Entre novamente ou revise a senha.", error: true },
  "name-mismatch": { message: "Digite exatamente o nome do time para confirmar.", error: true },
  "account-confirmation": { message: "Digite ENCERRAR exatamente como exibido.", error: true },
  unavailable: { message: "Não foi possível concluir agora. Atualize a página e tente novamente.", error: true },
};
