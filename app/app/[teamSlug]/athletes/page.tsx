import {
  reviewAthlete,
  setAthleteAvailability,
} from "@/app/app/[teamSlug]/athletes/actions";
import { AthleteRemoveButton } from "@/components/athlete-remove-button";
import { ManagementAthleteList } from "@/components/management-athlete-list";
import { Button } from "@/components/ui/button";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { AppContainer, PageHeader } from "@/components/ui/app-shell";
import { requireUser } from "@/lib/auth/dal";
import {
  buildManagementAthleteListUrl,
  getManagementAthletePage,
  parseManagementAthleteSearchParams,
  type ManagementAthleteFilters,
  type ManagementAthletePage,
  type ManagementAthleteStatus,
  type RawManagementAthleteSearchParams,
} from "@/lib/data/management-athletes";
import { createClient } from "@/lib/supabase/server";
import {
  BadgeCheck,
  Ban,
  Check,
  ChevronRight,
  Clock3,
  Edit3,
  Filter,
  History,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldQuestion,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusLabels = {
  pending: "Aguardando aprovação",
  active: "Ativo",
  inactive: "Inativo",
  rejected: "Rejeitado",
};

const enhancedStatusLabels: Record<ManagementAthleteStatus, string> = {
  active: "Em atividade",
  inactive: "Inativos",
  pending: "Aguardando aprovação",
  rejected: "Não aprovados",
};

function withoutCursor(filters: ManagementAthleteFilters) {
  return {
    status: filters.status,
    search: filters.search,
    positionCode: filters.positionCode,
  };
}

function AthleteFeedback({ query }: { query: RawManagementAthleteSearchParams }) {
  if (query.created === "1") return <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"><BadgeCheck className="size-5 shrink-0" aria-hidden />Atleta cadastrado e incluído nas próximas chamadas.</div>;
  if (query.updated === "1") return <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"><BadgeCheck className="size-5 shrink-0" aria-hidden />Dados do atleta atualizados.</div>;
  if (query.reviewed === "approve" || query.reviewed === "reject") return <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"><BadgeCheck className="size-5 shrink-0" aria-hidden />{query.reviewed === "approve" ? "Atleta confirmado e incluído no elenco." : "Solicitação de vínculo rejeitada."}</div>;
  if (query.availability === "active" || query.availability === "inactive") return <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"><BadgeCheck className="size-5 shrink-0" aria-hidden />{query.availability === "active" ? "Atleta reativado." : "Atleta marcado como inativo."}</div>;
  if (query.removed === "archived" || query.removed === "deleted") return <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"><BadgeCheck className="size-5 shrink-0" aria-hidden />{query.removed === "archived" ? "Vínculo removido e histórico esportivo preservado." : "Atleta removido definitivamente."}</div>;
  if (query.removeError === "1" || query.reviewError === "1" || query.availabilityError === "1") return <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">Não foi possível concluir a alteração. Atualize a página e tente novamente.</div>;
  return null;
}

function EnhancedAthletePage({
  team,
  query,
  filters,
  page,
}: {
  team: { id: string; name: string; slug: string; default_sport_format: "field" | "society" | "futsal" };
  query: RawManagementAthleteSearchParams;
  filters: ManagementAthleteFilters;
  page: ManagementAthletePage;
}) {
  const baseFilters = withoutCursor(filters);
  const hasFilters = Boolean(filters.search || filters.positionCode);
  const clearUrl = buildManagementAthleteListUrl(team.slug, {
    status: filters.status,
    search: null,
    positionCode: null,
  });
  const newAthleteAction = <Button asChild><Link href={`/app/${team.slug}/athletes/new`}><Plus aria-hidden /><span className="hidden sm:inline">Cadastrar atleta</span><span className="sm:hidden">Novo</span></Link></Button>;

  return (
    <main className="app-canvas pb-24">
      <AppContainer>
        <AthleteFeedback query={query} />
        <PageHeader eyebrow="BID do time" title="Atletas" description="Encontre e reconheça o elenco sem expor dados pessoais." action={newAthleteAction} />

        {page.pendingCount > 0 && filters.status !== "pending" ? (
          <Link href={buildManagementAthleteListUrl(team.slug, { status: "pending", search: null, positionCode: null })} className="-mt-3 mb-5 flex min-h-12 items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-950">
            <span>{page.pendingCount} {page.pendingCount === 1 ? "vínculo aguarda" : "vínculos aguardam"} aprovação</span>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : null}

        <nav aria-label="Situação dos atletas" className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(enhancedStatusLabels) as ManagementAthleteStatus[]).map((status) => {
            const active = filters.status === status;
            return <Link key={status} href={buildManagementAthleteListUrl(team.slug, { ...baseFilters, status })} aria-current={active ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-black transition ${active ? "bg-grass text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800"}`}>{enhancedStatusLabels[status]}</Link>;
          })}
          <Link href={`/app/${team.slug}/athletes?view=removed`} className="flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 hover:border-emerald-300 hover:text-emerald-800">Removidos</Link>
        </nav>

        <form action={`/app/${team.slug}/athletes`} method="get" className="app-surface mb-5 p-4 sm:p-5">
          {filters.status !== "active" ? <input type="hidden" name="status" value={filters.status} /> : null}
          <div className="flex items-center gap-2"><Filter className="size-4 text-emerald-700" aria-hidden /><h2 className="text-sm font-black">Encontrar atleta</h2></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="text-xs font-bold text-slate-600">Nome ou apelido</span><span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden /><input name="q" type="search" minLength={2} maxLength={80} defaultValue={filters.search ?? ""} placeholder="Ex.: João ou Jota" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></span></label>
            <label><span className="text-xs font-bold text-slate-600">Posição</span><select name="position" defaultValue={filters.positionCode ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"><option value="">Todas</option>{page.positions.map((position) => <option key={position.code} value={position.code}>{position.label}</option>)}</select></label>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button type="submit"><Search aria-hidden />Aplicar filtros</Button>{hasFilters ? <Button asChild variant="outline"><Link href={clearUrl}>Limpar filtros</Link></Button> : null}</div>
        </form>

        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="app-kicker">{enhancedStatusLabels[filters.status]}</p><h2 className="mt-1 text-xl font-black tracking-tight">Elenco encontrado</h2></div><p aria-live="polite" aria-atomic="true" className="text-sm font-bold text-slate-600">{page.filteredCount} {page.filteredCount === 1 ? "atleta" : "atletas"}</p></div>

        {page.items.length ? <ManagementAthleteList athletes={page.items} teamSlug={team.slug} returnUrl={buildManagementAthleteListUrl(team.slug, baseFilters, filters.cursor)} /> : (
          <div className="app-surface border-dashed p-8 text-center"><UserRound className="mx-auto size-8 text-slate-400" aria-hidden /><p className="mt-3 font-semibold">{hasFilters ? "Nenhum atleta com estes filtros" : `Nenhum atleta em ${enhancedStatusLabels[filters.status].toLowerCase()}`}</p><p className="mt-1 text-sm text-slate-500">{hasFilters ? "Ajuste a busca ou limpe os filtros para tentar novamente." : "Os atletas aparecerão aqui quando estiverem disponíveis."}</p>{hasFilters ? <Button asChild variant="outline" className="mt-5"><Link href={clearUrl}>Limpar filtros</Link></Button> : filters.status === "active" ? <Button asChild className="mt-5"><Link href={`/app/${team.slug}/athletes/new`}>Cadastrar primeiro atleta</Link></Button> : null}</div>
        )}

        {page.nextCursor ? <div className="mt-6 flex justify-center"><Button asChild variant="outline"><Link href={buildManagementAthleteListUrl(team.slug, baseFilters, page.nextCursor)}>Próxima página<ChevronRight aria-hidden /></Link></Button></div> : null}
      </AppContainer>
    </main>
  );
}

export default async function AthletesPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<RawManagementAthleteSearchParams>;
}) {
  const user = await requireUser();
  const { teamSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, slug, default_sport_format")
    .eq("slug", teamSlug)
    .maybeSingle();
  if (!team) notFound();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) notFound();

  const parsedFilters = parseManagementAthleteSearchParams(query);
  const managementResult = query.view === "removed"
    ? { mode: "unavailable" as const }
    : parsedFilters.ok
      ? await getManagementAthletePage(
          team.id,
          team.default_sport_format,
          parsedFilters.filters,
        )
      : { mode: "error" as const };

  if (managementResult.mode === "enhanced" && parsedFilters.ok) {
    return <EnhancedAthletePage team={team} query={query} filters={parsedFilters.filters} page={managementResult.page} />;
  }

  if (managementResult.mode === "error") {
    const retryUrl = parsedFilters.ok
      ? buildManagementAthleteListUrl(
          team.slug,
          withoutCursor(parsedFilters.filters),
          parsedFilters.filters.cursor,
        )
      : `/app/${team.slug}/athletes`;
    return <main className="app-canvas pb-24"><AppContainer><PageHeader eyebrow="BID do time" title="Atletas" description="Encontre e reconheça o elenco sem expor dados pessoais." action={<Button asChild><Link href={`/app/${team.slug}/athletes/new`}><Plus aria-hidden />Novo</Link></Button>} /><div role="alert" className="app-surface border-red-200 bg-red-50 p-8 text-center"><p className="font-black text-red-900">Não foi possível carregar</p><p className="mt-1 text-sm text-red-700">{parsedFilters.ok ? "Atualize a página e tente novamente." : parsedFilters.message}</p><Button asChild variant="outline" className="mt-5"><Link href={retryUrl}>Tentar novamente</Link></Button></div></AppContainer></main>;
  }

  const { data: athletes } = await supabase
    .from("athletes")
    .select("id, user_id, registration_number, full_name, preferred_name, shirt_number, status, registration_source, created_at, removed_at")
    .eq("team_id", team.id)
    .order("created_at", { ascending: false });

  const athleteIds = (athletes ?? []).map((athlete) => athlete.id);
  const [{ data: privateRows }, { data: preferences }] = athleteIds.length
    ? await Promise.all([
        supabase
          .from("athlete_private")
          .select("athlete_id, phone_e164, email")
          .in("athlete_id", athleteIds),
        supabase
          .from("athlete_position_preferences")
          .select("athlete_id, position_code, priority")
          .in("athlete_id", athleteIds)
          .order("priority"),
      ])
    : [{ data: [] }, { data: [] }];

  const privateByAthlete = new Map((privateRows ?? []).map((row) => [row.athlete_id, row]));
  const positionsByAthlete = new Map<string, string[]>();
  for (const preference of preferences ?? []) {
    positionsByAthlete.set(preference.athlete_id, [
      ...(positionsByAthlete.get(preference.athlete_id) ?? []),
      preference.position_code,
    ]);
  }

  const currentAthletes = (athletes ?? []).filter(
    (athlete) => !athlete.removed_at,
  );
  const removedAthletes = (athletes ?? []).filter(
    (athlete) => Boolean(athlete.removed_at),
  );
  const pending = currentAthletes.filter(
    (athlete) => athlete.status === "pending",
  );
  const roster = currentAthletes.filter(
    (athlete) => athlete.status !== "pending",
  );
  const canManageRelationship =
    membership.role === "owner" || membership.role === "admin";
  const showingRemoved = query.view === "removed";

  return (
    <main className="app-canvas pb-24">
      <AppContainer>
        {query.created === "1" && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            <BadgeCheck className="size-5 shrink-0" aria-hidden /> Atleta cadastrado e incluído nas próximas chamadas.
          </div>
        )}

        {query.updated === "1" && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            <BadgeCheck className="size-5 shrink-0" aria-hidden /> Dados do
            atleta atualizados.
          </div>
        )}

        {(query.removed === "archived" || query.removed === "deleted") && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            <BadgeCheck className="size-5 shrink-0" aria-hidden />
            {query.removed === "archived"
              ? "Vínculo removido. O histórico esportivo foi preservado e os dados privados foram eliminados."
              : "Atleta removido definitivamente porque ainda não possuía histórico esportivo."}
          </div>
        )}

        {query.removeError === "1" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            Não foi possível remover este vínculo. Atualize a página e tente
            novamente.
          </div>
        )}

        {(query.reviewed === "approve" || query.reviewed === "reject") && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"
          >
            <BadgeCheck className="size-5 shrink-0" aria-hidden />
            {query.reviewed === "approve"
              ? "Atleta confirmado e incluído no elenco."
              : "Solicitação de vínculo rejeitada."}
          </div>
        )}

        {query.reviewError === "1" && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            Não foi possível concluir a análise do atleta. Tente novamente.
          </div>
        )}

        {(query.availability === "active" ||
          query.availability === "inactive") && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"
          >
            <BadgeCheck className="size-5 shrink-0" aria-hidden />
            {query.availability === "active"
              ? "Atleta reativado."
              : "Atleta marcado como inativo."}
          </div>
        )}

        {query.availabilityError === "1" && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            Não foi possível alterar a disponibilidade do atleta.
          </div>
        )}

        <PageHeader
          eyebrow="BID do time"
          title="Atletas"
          description={`${currentAthletes.length} cadastros atuais · ${pending.length} aguardando análise`}
          action={
            <Button asChild>
              <Link href={`/app/${team.slug}/athletes/new`}>
                <Plus aria-hidden /> <span className="hidden sm:inline">Cadastrar atleta</span><span className="sm:hidden">Novo</span>
              </Link>
            </Button>
          }
        />

        <nav
          aria-label="Visualização do elenco"
          className="flex rounded-2xl bg-slate-100 p-1"
        >
          <Link
            href={`/app/${team.slug}/athletes`}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${!showingRemoved ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <UserRound className="size-4" aria-hidden /> Elenco
          </Link>
          <Link
            href={`/app/${team.slug}/athletes?view=removed`}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${showingRemoved ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <History className="size-4" aria-hidden /> Removidos
            {removedAthletes.length ? (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
                {removedAthletes.length}
              </span>
            ) : null}
          </Link>
        </nav>

        {!showingRemoved && pending.length > 0 && (
          <section>
            <div className="flex items-center gap-2">
              <ShieldQuestion className="size-5 text-amber-600" aria-hidden />
              <h2 className="text-lg font-black tracking-tight">Confirmar vínculo</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{pending.length}</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {pending.map((athlete) => {
                const contact = privateByAthlete.get(athlete.id);
                return (
                  <article key={athlete.id} className="app-surface border-amber-200 p-5">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Clock3 className="size-5" aria-hidden /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold">{athlete.preferred_name || athlete.full_name}</h3>
                        {athlete.preferred_name && <p className="truncate text-xs text-slate-500">{athlete.full_name}</p>}
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          {athlete.user_id ? <BadgeCheck className="size-3.5 text-emerald-700" aria-hidden /> : null}
                          {athlete.user_id ? "WhatsApp verificado" : "Cadastro público legado"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                      {contact?.phone_e164 && <p className="flex items-center gap-2"><Phone className="size-4" aria-hidden /> {contact.phone_e164}</p>}
                      {contact?.email && <p className="flex items-center gap-2 truncate"><Mail className="size-4 shrink-0" aria-hidden /> {contact.email}</p>}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <form action={reviewAthlete}>
                        <input type="hidden" name="athleteId" value={athlete.id} />
                        <input type="hidden" name="teamSlug" value={team.slug} />
                        <input type="hidden" name="decision" value="reject" />
                        <AsyncSubmitButton pendingLabel="Rejeitando..." variant="outline" className="h-11 w-full rounded-xl"><X aria-hidden /> Rejeitar</AsyncSubmitButton>
                      </form>
                      <form action={reviewAthlete}>
                        <input type="hidden" name="athleteId" value={athlete.id} />
                        <input type="hidden" name="teamSlug" value={team.slug} />
                        <input type="hidden" name="decision" value="approve" />
                        <AsyncSubmitButton pendingLabel="Confirmando..." className="h-11 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"><Check aria-hidden /> Aprovar</AsyncSubmitButton>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!showingRemoved ? <section>
          <p className="app-kicker">Disponibilidade</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Elenco</h2>
          {roster.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {roster.map((athlete) => {
                const contact = privateByAthlete.get(athlete.id);
                const positions = positionsByAthlete.get(athlete.id) ?? [];
                const canToggle = athlete.status === "active" || athlete.status === "inactive";
                return (
                  <article key={athlete.id} className="app-surface p-5">
                    <div className="flex items-start gap-3">
                      <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${athlete.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {athlete.shirt_number ?? <UserRound className="size-5" aria-hidden />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-bold">{athlete.preferred_name || athlete.full_name}</h3>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${athlete.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{statusLabels[athlete.status]}</span>
                        </div>
                        {athlete.preferred_name && <p className="truncate text-xs text-slate-500">{athlete.full_name}</p>}
                        <p className="mt-2 text-xs text-slate-500">BID #{athlete.registration_number}</p>
                      </div>
                    </div>

                    {positions.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{positions.map((position, index) => <span key={position} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{index + 1}. {position}</span>)}</div>}
                    {(contact?.phone_e164 || contact?.email) && <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">{contact.phone_e164 && <p>{contact.phone_e164}</p>}{contact.email && <p className="truncate">{contact.email}</p>}</div>}

                    {canManageRelationship ? (
                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                        <Button asChild size="sm" variant="outline" className="h-10 rounded-xl">
                          <Link href={`/app/${team.slug}/athletes/${athlete.id}/edit`}>
                            <Edit3 aria-hidden /> Editar
                          </Link>
                        </Button>
                        <AthleteRemoveButton
                          athleteId={athlete.id}
                          athleteName={
                            athlete.preferred_name || athlete.full_name
                          }
                          teamSlug={team.slug}
                        />
                      </div>
                    ) : null}

                    {canToggle && (
                      <form action={setAthleteAvailability} className="mt-4">
                        <input type="hidden" name="athleteId" value={athlete.id} />
                        <input type="hidden" name="teamSlug" value={team.slug} />
                        <input type="hidden" name="status" value={athlete.status === "active" ? "inactive" : "active"} />
                        <AsyncSubmitButton pendingLabel={athlete.status === "active" ? "Atualizando..." : "Reativando..."} size="sm" variant="ghost" className="h-10 w-full rounded-xl text-slate-600">
                          {athlete.status === "active" ? <><Ban aria-hidden /> Marcar como inativo</> : <><Check aria-hidden /> Reativar atleta</>}
                        </AsyncSubmitButton>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="app-surface mt-3 border-dashed p-8 text-center">
              <UserRound className="mx-auto size-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold">O elenco ainda está vazio</p>
              <p className="mt-1 text-sm text-slate-500">Cadastre diretamente ou aprove os pedidos recebidos.</p>
            </div>
          )}
        </section> : (
          <section>
            <p className="app-kicker">Histórico preservado</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">
              Atletas removidos
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Estes vínculos tinham participação em partidas. Contato,
              nascimento, posições atuais e chamadas futuras já foram
              removidos; nome esportivo, camisa e fatos da partida permanecem
              para manter as súmulas corretas.
            </p>
            {removedAthletes.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {removedAthletes.map((athlete) => (
                  <article key={athlete.id} className="app-surface p-5 opacity-80">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                        {athlete.shirt_number ?? (
                          <History className="size-5" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-bold">
                            {athlete.preferred_name || athlete.full_name}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                            Removido
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          BID #{athlete.registration_number} · removido em{" "}
                          {new Intl.DateTimeFormat("pt-BR").format(
                            new Date(athlete.removed_at!),
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="app-surface mt-4 border-dashed p-8 text-center">
                <History className="mx-auto size-8 text-slate-400" aria-hidden />
                <p className="mt-3 font-semibold">Nenhum vínculo arquivado</p>
                <p className="mt-1 text-sm text-slate-500">
                  Atletas sem histórico são excluídos definitivamente e não
                  aparecem aqui.
                </p>
              </div>
            )}
          </section>
        )}
      </AppContainer>
    </main>
  );
}
