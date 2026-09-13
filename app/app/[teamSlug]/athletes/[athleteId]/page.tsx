import {
  reviewAthlete,
  setAthleteAvailability,
} from "@/app/app/[teamSlug]/athletes/actions";
import { AthleteRemoveButton } from "@/components/athlete-remove-button";
import { AsyncSubmitButton } from "@/components/ui/async-submit-button";
import { AppContainer } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import {
  getManagementAthleteDetail,
  safeManagementAthleteReturnTo,
  type ManagementAthleteDetail,
} from "@/lib/data/management-athlete-detail";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CalendarDays,
  Check,
  Edit3,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type DetailSearchParams = Record<string, string | string[] | undefined>;

const statusLabels = {
  active: "Em atividade",
  inactive: "Inativo",
  pending: "Aguardando aprovação",
  rejected: "Não aprovado",
} as const;

const sourceLabels = {
  admin: "Cadastrado pela diretoria",
  public_form: "Cadastro solicitado pelo atleta",
  import: "Cadastro importado",
} as const;

const eventKindLabels = {
  weekly_match: "Jogo semanal",
  championship: "Campeonato",
  friendly: "Amistoso",
  tournament: "Torneio",
  training: "Treino",
  other: "Outro encontro",
} as const;

const attendanceLabels = {
  pending: "Resposta pendente",
  confirmed: "Presença confirmada",
  declined: "Não participará",
  maybe: "Talvez participe",
  waitlist: "Lista de espera",
} as const;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatDate(value: string, timezone: string, withTime = false) {
  const date = withTime ? new Date(value) : new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: withTime ? timezone : "UTC",
    day: "2-digit",
    month: withTime ? "short" : "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function DetailActions({
  detail,
  teamSlug,
}: {
  detail: ManagementAthleteDetail;
  teamSlug: string;
}) {
  if (!detail.allowed_actions.can_edit && !detail.allowed_actions.can_review) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="flex items-center gap-2 font-black"><ShieldCheck className="size-4" aria-hidden />Consulta em modo somente leitura</p>
        <p className="mt-1">Alterações permanecem restritas à administração do time.</p>
      </div>
    );
  }

  if (detail.allowed_actions.can_review) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <form action={reviewAthlete}>
          <input type="hidden" name="athleteId" value={detail.id} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="decision" value="reject" />
          <AsyncSubmitButton pendingLabel="Rejeitando..." variant="outline" className="min-h-11 w-full rounded-xl"><X aria-hidden />Rejeitar vínculo</AsyncSubmitButton>
        </form>
        <form action={reviewAthlete}>
          <input type="hidden" name="athleteId" value={detail.id} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="decision" value="approve" />
          <AsyncSubmitButton pendingLabel="Confirmando..." className="min-h-11 w-full rounded-xl"><Check aria-hidden />Aprovar vínculo</AsyncSubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" className="min-h-11 rounded-xl">
          <Link href={`/app/${teamSlug}/athletes/${detail.id}/edit`}><Edit3 aria-hidden />Editar cadastro</Link>
        </Button>
        {detail.allowed_actions.can_remove ? (
          <AthleteRemoveButton athleteId={detail.id} athleteName={detail.display_name} teamSlug={teamSlug} />
        ) : null}
      </div>
      {detail.allowed_actions.can_change_availability ? (
        <form action={setAthleteAvailability}>
          <input type="hidden" name="athleteId" value={detail.id} />
          <input type="hidden" name="teamSlug" value={teamSlug} />
          <input type="hidden" name="status" value={detail.status === "active" ? "inactive" : "active"} />
          <AsyncSubmitButton pendingLabel="Atualizando..." variant="ghost" className="min-h-11 w-full rounded-xl text-slate-600">
            {detail.status === "active" ? <><Ban aria-hidden />Marcar como inativo</> : <><RotateCcw aria-hidden />Reativar atleta</>}
          </AsyncSubmitButton>
        </form>
      ) : null}
    </div>
  );
}

export default async function ManagementAthleteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string; athleteId: string }>;
  searchParams: Promise<DetailSearchParams>;
}) {
  await requireUser();
  const [{ teamSlug, athleteId }, query] = await Promise.all([params, searchParams]);
  const returnTo = safeManagementAthleteReturnTo(teamSlug, query.returnTo);
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, slug, timezone")
    .eq("slug", teamSlug)
    .maybeSingle();
  if (!team) notFound();

  const result = await getManagementAthleteDetail(team.id, athleteId);
  if (result.mode === "not_found") notFound();

  if (result.mode === "unavailable") {
    return (
      <main className="app-canvas pb-24"><AppContainer><div className="mx-auto max-w-3xl py-6 sm:py-10">
        <Link href={returnTo} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="size-4" aria-hidden />Voltar aos atletas</Link>
        <div role="status" className="app-surface mt-4 border-amber-200 bg-amber-50 p-8 text-center"><p className="font-black text-amber-950">Detalhes temporariamente indisponíveis</p><p className="mt-1 text-sm text-amber-800">A lista de atletas continua disponível.</p><Button asChild variant="outline" className="mt-5"><Link href={returnTo}>Voltar ao elenco</Link></Button></div>
      </div></AppContainer></main>
    );
  }

  if (result.mode === "error") {
    return (
      <main className="app-canvas pb-24"><AppContainer><div className="mx-auto max-w-3xl py-6 sm:py-10">
        <Link href={returnTo} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="size-4" aria-hidden />Voltar aos atletas</Link>
        <div role="alert" className="app-surface mt-4 border-red-200 bg-red-50 p-8 text-center"><p className="font-black text-red-900">Não foi possível carregar o atleta</p><p className="mt-1 text-sm text-red-700">Atualize a página e tente novamente.</p><Button asChild variant="outline" className="mt-5"><Link href={`/app/${team.slug}/athletes/${athleteId}?${new URLSearchParams({ returnTo }).toString()}`}>Tentar novamente</Link></Button></div>
      </div></AppContainer></main>
    );
  }

  const detail = result.detail;
  const contactAvailable = Boolean(
    detail.contact.birth_date || detail.contact.phone_e164 || detail.contact.email || detail.contact.notes,
  );

  return (
    <main className="app-canvas pb-24">
      <AppContainer><div className="mx-auto max-w-3xl py-6 sm:py-10">
        <Link href={returnTo} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="size-4" aria-hidden />Voltar aos atletas</Link>

        <header className="mt-4 flex items-center gap-4 sm:gap-5">
          <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100 to-slate-200 sm:size-24">
            {detail.photo_url ? <Image src={detail.photo_url} alt={`Foto de ${detail.display_name}`} fill sizes="96px" unoptimized className="object-cover" /> : <span aria-hidden className="text-2xl font-black text-emerald-900/35">{initials(detail.display_name) || <UserRound className="size-8" />}</span>}
          </div>
          <div className="min-w-0">
            <p className="app-kicker">BID #{detail.registration_number}</p>
            <h1 className="app-title mt-1 truncate">{detail.display_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">{statusLabels[detail.status]}</span>{detail.claimed ? <span className="inline-flex items-center gap-1 text-sky-800"><BadgeCheck className="size-4" aria-hidden />Perfil confirmado</span> : <span>Cadastro do time</span>}</div>
          </div>
        </header>

        <div className="mt-6 grid gap-5">
          <section className="app-surface p-5 sm:p-6" aria-labelledby="cadastro-heading">
            <h2 id="cadastro-heading" className="text-lg font-black">Cadastro no time</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="font-bold text-slate-500">Nome completo</dt><dd className="mt-1 font-semibold text-graphite">{detail.full_name}</dd></div>
              <div><dt className="font-bold text-slate-500">Camisa</dt><dd className="mt-1 font-semibold text-graphite">{detail.shirt_number ?? "Não informada"}</dd></div>
              <div><dt className="font-bold text-slate-500">Origem</dt><dd className="mt-1 font-semibold text-graphite">{sourceLabels[detail.registration_source]}</dd></div>
              <div><dt className="font-bold text-slate-500">No elenco desde</dt><dd className="mt-1 font-semibold text-graphite">{detail.joined_on ? formatDate(detail.joined_on, team.timezone) : formatDate(detail.created_at, team.timezone)}</dd></div>
            </dl>
            <div className="mt-5"><p className="text-sm font-bold text-slate-500">Posições</p>{detail.positions.length ? <div className="mt-2 flex flex-wrap gap-2">{detail.positions.map((position, index) => <span key={`${position.sport_format}-${position.code}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">{index + 1}. {position.label}</span>)}</div> : <p className="mt-1 text-sm text-slate-600">Nenhuma posição informada.</p>}</div>
          </section>

          <section className="app-surface p-5 sm:p-6" aria-labelledby="contact-heading">
            <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-700" aria-hidden /><h2 id="contact-heading" className="text-lg font-black">Contato privado</h2></div>
            <p className="mt-1 text-sm text-slate-500">Visível somente para a gestão autorizada deste time.</p>
            {contactAvailable ? <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              {detail.contact.phone_e164 ? <div><dt className="font-bold text-slate-500">Telefone</dt><dd className="mt-1"><a href={`tel:${detail.contact.phone_e164}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-800"><Phone className="size-4" aria-hidden />{detail.contact.phone_e164}</a></dd></div> : null}
              {detail.contact.email ? <div><dt className="font-bold text-slate-500">E-mail</dt><dd className="mt-1"><a href={`mailto:${detail.contact.email}`} className="inline-flex min-h-11 items-center gap-2 break-all font-semibold text-emerald-800"><Mail className="size-4" aria-hidden />{detail.contact.email}</a></dd></div> : null}
              {detail.contact.birth_date ? <div><dt className="font-bold text-slate-500">Nascimento</dt><dd className="mt-1 font-semibold text-graphite">{formatDate(detail.contact.birth_date, team.timezone)}</dd></div> : null}
              {detail.contact.notes ? <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Observações</dt><dd className="mt-1 whitespace-pre-wrap font-semibold text-graphite">{detail.contact.notes}</dd></div> : null}
            </dl> : <p className="mt-4 text-sm font-semibold text-slate-600">Nenhum contato privado informado.</p>}
          </section>

          <section className="app-surface p-5 sm:p-6" aria-labelledby="participation-heading">
            <div className="flex items-center gap-2"><CalendarDays className="size-5 text-emerald-700" aria-hidden /><h2 id="participation-heading" className="text-lg font-black">Participações recentes</h2></div>
            {detail.recent_participations.length ? <ul className="mt-4 divide-y divide-slate-100">{detail.recent_participations.map((participation) => <li key={participation.event_id} className="py-3 first:pt-0 last:pb-0"><Link href={`/app/${team.slug}/events/${participation.event_id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"><span><span className="block font-black text-graphite">{participation.title}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{eventKindLabels[participation.kind]} · {formatDate(participation.starts_at, team.timezone, true)}</span></span><span className="text-right text-xs font-bold text-emerald-800">{attendanceLabels[participation.attendance_status]}{participation.in_lineup ? <span className="mt-1 block text-slate-500">Na escalação</span> : null}</span></Link></li>)}</ul> : <p className="mt-4 text-sm font-semibold text-slate-600">Nenhuma participação registrada.</p>}
          </section>

          <section className="app-surface p-5 sm:p-6" aria-labelledby="statistics-heading">
            <div className="flex items-center gap-2"><MapPin className="size-5 text-slate-500" aria-hidden /><h2 id="statistics-heading" className="text-lg font-black">Estatísticas esportivas</h2></div>
            <p className="mt-2 text-sm font-semibold text-slate-600">Ainda não disponíveis nesta etapa. Nenhum número é estimado a partir das participações.</p>
          </section>

          <section className="app-surface p-5 sm:p-6" aria-labelledby="actions-heading"><h2 id="actions-heading" className="mb-4 text-lg font-black">Ações do atleta</h2><DetailActions detail={detail} teamSlug={team.slug} /></section>
        </div>
      </div></AppContainer>
    </main>
  );
}
