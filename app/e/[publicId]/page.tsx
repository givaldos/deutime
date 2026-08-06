import { BrandMark } from "@/components/brand-mark";
import { EventAccessBootstrap } from "@/components/event-access-bootstrap";
import { EventAccessAttendance } from "@/components/event-access-attendance";
import { Button } from "@/components/ui/button";
import {
  type EventAccessContext,
  getEventAccessContext,
} from "@/lib/data/event-access";
import { getPublicEvent } from "@/lib/data/public-event";
import { getTeamLogoUrlByEventPublicId } from "@/lib/data/team-logo";
import {
  formatPublicEventDate,
  formatPublicEventTime,
  formatPublicEventTimeZone,
  isPublicEventId,
  publicEventFormatLabels,
  publicEventKindLabels,
  publicEventStatusPresentation,
} from "@/lib/features/public-event/presentation";
import {
  CheckCircle2,
  CircleSlash2,
  Clock3,
  History,
  LogIn,
  ShieldCheck,
  Swords,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type PublicEventPageProps = {
  params: Promise<{ publicId: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusStyles = {
  emerald: {
    badge: "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30",
    Icon: CheckCircle2,
  },
  amber: {
    badge: "bg-amber-400/20 text-amber-200 border border-amber-400/30",
    Icon: CircleSlash2,
  },
  slate: {
    badge: "bg-white/10 text-slate-200 border border-white/15",
    Icon: History,
  },
} as const;

export async function generateMetadata({
  params,
}: PublicEventPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const event = isPublicEventId(publicId)
    ? await getPublicEvent(publicId)
    : null;

  const robots = {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  } as const;

  if (!event) {
    return {
      title: "Evento não encontrado",
      description: "Este evento não está disponível.",
      robots,
    };
  }

  const description = `${publicEventKindLabels[event.kind]} do ${event.team_name} em ${formatPublicEventDate(event.starts_at, event.team_timezone)}, às ${formatPublicEventTime(event.starts_at, event.team_timezone)}.`;
  const canonicalPath = `/e/${event.public_id}`;
  const imagePath = `${canonicalPath}/convite.png`;

  return {
    title: `${event.title} — ${event.team_name}`,
    description,
    alternates: { canonical: canonicalPath },
    robots,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "DeuTime",
      title: `${event.title} — ${event.team_name}`,
      description,
      url: canonicalPath,
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: `${event.title} — ${event.team_name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} — ${event.team_name}`,
      description,
      images: [imagePath],
    },
  };
}

export default async function PublicEventPage({
  params,
}: PublicEventPageProps) {
  const { publicId } = await params;
  if (!isPublicEventId(publicId)) notFound();

  const event = await getPublicEvent(publicId);
  if (!event) notFound();

  // Busca logo e acesso em paralelo
  const [access, teamLogoUrl] = await Promise.all([
    getEventAccessContext(publicId),
    getTeamLogoUrlByEventPublicId(publicId),
  ]);

  const ev = { ...event, team_logo_url: teamLogoUrl };

  const status = publicEventStatusPresentation[ev.status];
  const style = statusStyles[status.tone];
  const startsAtLabel = formatPublicEventTime(ev.starts_at, ev.team_timezone);
  const endsAtLabel = formatPublicEventTime(ev.ends_at, ev.team_timezone);

  return (
    <main className="min-h-svh bg-[#f5f4ef] pb-10 text-graphite">
      <header
        data-testid="public-event-header"
        className="relative overflow-hidden bg-[#0d2b22] px-5 pb-16 pt-5 text-white sm:pb-20 sm:pt-6"
      >
        {/* Faixa volt — mesma identidade do opengraph */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-volt" />
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-volt/5 blur-3xl" />

        <div className="relative mx-auto max-w-xl pl-3">
          {/* Linha superior: logo + nome do time + brand */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {ev.team_logo_url ? (
                <Image
                  src={ev.team_logo_url}
                  alt={`Escudo ${ev.team_name}`}
                  width={48}
                  height={48}
                  className="size-12 rounded-xl object-cover"
                  unoptimized
                />
              ) : (
                <div
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-xl border border-volt/30 bg-volt/10 text-lg font-black text-volt"
                >
                  {ev.team_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                  Convocação
                </p>
                <p className="text-base font-black leading-tight text-volt">
                  {ev.team_name}
                </p>
              </div>
            </div>
            <BrandMark inverted className="opacity-60" />
          </div>

          {/* Título do evento */}
          <h1 className="mt-7 break-words text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            {ev.title}
          </h1>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-black ${style.badge}`}>
              {status.label}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
              {publicEventFormatLabels[ev.sport_format]}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
              {publicEventKindLabels[ev.kind]}
            </span>
          </div>

          {/* Bloco de data — destaque máximo */}
          <div className="mt-6 flex items-stretch overflow-hidden rounded-2xl">
            <div className="flex min-w-[72px] flex-col items-center justify-center bg-volt px-4 py-4 text-center text-[#0d2b22]">
              <time
                dateTime={ev.starts_at}
                className="text-3xl font-black leading-none"
              >
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  timeZone: ev.team_timezone,
                }).format(new Date(ev.starts_at))}
              </time>
              <span className="mt-1 text-[0.6rem] font-black uppercase tracking-widest">
                {new Intl.DateTimeFormat("pt-BR", {
                  month: "short",
                  timeZone: ev.team_timezone,
                })
                  .format(new Date(ev.starts_at))
                  .replace(".", "")}
              </span>
            </div>
            <div className="flex flex-col justify-center bg-volt/15 px-5 py-3">
              <p className="text-sm font-black capitalize text-white">
                {new Intl.DateTimeFormat("pt-BR", {
                  weekday: "long",
                  timeZone: ev.team_timezone,
                }).format(new Date(ev.starts_at))}
              </p>
              <p className="mt-0.5 text-2xl font-black text-volt">
                {startsAtLabel}
                <span className="ml-1 text-sm font-bold text-emerald-300">
                  às {endsAtLabel}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-400">
                Horário de {formatPublicEventTimeZone(ev.team_timezone)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div
        data-testid="public-event-content"
        className="relative z-10 mx-auto -mt-8 max-w-xl space-y-4 px-4"
      >
        <EventAccessBootstrap
          accessPath={`/e/${publicId}/access`}
          clearInvalidCookie={access.clearInvalidCookie}
        />

        {access.context ? (
          <RecognizedEventAccess context={access.context} />
        ) : null}

        {ev.opponent_name ? (
          <section className="app-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-grass text-volt">
                <Swords className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Adversário
                </p>
                <p className="mt-0.5 font-black text-slate-900">
                  {ev.opponent_name}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="app-surface p-5">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Clock3 className="size-4 shrink-0 text-emerald-700" aria-hidden />
              <span>
                Início às <strong className="text-slate-900">{startsAtLabel}</strong>
                {" · "}
                Término às <strong className="text-slate-900">{endsAtLabel}</strong>
              </span>
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="size-4 shrink-0 text-emerald-700" aria-hidden />
              Horário de {formatPublicEventTimeZone(ev.team_timezone)}
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-bold text-slate-900">{status.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {status.description}
            </p>
          </div>
        </section>

        {!access.context ? (
          <section className="rounded-[1.5rem] bg-[#0d2b22] p-6 text-white shadow-[0_18px_45px_-28px_rgba(2,20,14,.7)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
              Área do atleta
            </p>
            <h2 className="mt-2 text-xl font-black">
              Suas confirmações continuam na agenda
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              A resposta direta por este link será liberada em uma próxima
              etapa.
            </p>
            <Button
              asChild
              className="mt-5 min-h-12 w-full rounded-xl bg-volt font-black text-[#0d2b22] hover:bg-volt/90"
            >
              <Link href="/me/agenda">
                <LogIn aria-hidden /> Abrir minha agenda
              </Link>
            </Button>
          </section>
        ) : null}

        <p className="px-3 pt-2 text-center text-xs leading-5 text-slate-500">
          {access.context
            ? "Seu acesso está limitado a este atleta e evento."
            : "Este endereço identifica o evento, mas não concede acesso a dados privados do time ou dos atletas."}
        </p>
      </div>
    </main>
  );
}

function RecognizedEventAccess({ context }: { context: EventAccessContext }) {
  return (
    <section
      data-testid="recognized-event-access"
      className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_18px_45px_-32px_rgba(2,80,54,.45)]"
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
        Acesso reconhecido
      </p>
      <h2 className="mt-2 text-xl font-black text-grass">
        Olá, {context.athleteDisplayName}
      </h2>
      <EventAccessAttendance
        key={`${context.publicId}:${context.attendanceStatus}:${context.canRespond}`}
        publicId={context.publicId}
        currentStatus={context.attendanceStatus}
        canRespond={context.canRespond}
      />
      <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-emerald-950">
        <ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden />
        {context.source === "verified_session"
          ? "Este aparelho já foi verificado. Você não precisa repetir o código para consultar este evento."
          : "Este acesso vale somente para você neste evento e pode ser revogado pelo time."}
      </p>
    </section>
  );
}
