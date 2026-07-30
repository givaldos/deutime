import { BrandMark } from "@/components/brand-mark";
import { EventAccessBootstrap } from "@/components/event-access-bootstrap";
import { EventAccessAttendance } from "@/components/event-access-attendance";
import { Button } from "@/components/ui/button";
import {
  type EventAccessContext,
  getEventAccessContext,
} from "@/lib/data/event-access";
import { getPublicEvent } from "@/lib/data/public-event";
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
  CalendarDays,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  History,
  LogIn,
  ShieldCheck,
  Swords,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PublicEventPageProps = {
  params: Promise<{ publicId: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusStyles = {
  emerald: {
    badge: "bg-emerald-100 text-emerald-900",
    icon: "bg-emerald-400/15 text-lime",
    Icon: CheckCircle2,
  },
  amber: {
    badge: "bg-amber-100 text-amber-950",
    icon: "bg-amber-400/15 text-amber-300",
    Icon: CircleSlash2,
  },
  slate: {
    badge: "bg-slate-200 text-slate-800",
    icon: "bg-white/10 text-slate-200",
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
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "DeuTime — deu time, deu jogo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} — ${event.team_name}`,
      description,
      images: ["/opengraph-image"],
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
  const access = await getEventAccessContext(publicId);

  const status = publicEventStatusPresentation[event.status];
  const style = statusStyles[status.tone];
  const StatusIcon = style.Icon;
  const startsAtLabel = formatPublicEventTime(
    event.starts_at,
    event.team_timezone,
  );
  const endsAtLabel = formatPublicEventTime(
    event.ends_at,
    event.team_timezone,
  );

  return (
    <main className="min-h-svh bg-[#f5f4ef] pb-10 text-graphite">
      <header
        data-testid="public-event-header"
        className="relative overflow-hidden bg-grass px-5 pb-14 pt-5 text-white sm:pb-16 sm:pt-6"
      >
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative mx-auto max-w-xl">
          <BrandMark inverted />

          <div className="mt-7 flex items-start gap-3 sm:mt-10 sm:gap-4">
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-2xl ${style.icon}`}
            >
              <StatusIcon className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                {event.team_name}
              </p>
              <h1 className="mt-2 break-words text-3xl font-black leading-none tracking-[-0.05em] sm:text-5xl">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-black ${style.badge}`}
            >
              {status.label}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
              {publicEventFormatLabels[event.sport_format]}
            </span>
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

        <section className="app-surface overflow-hidden" aria-labelledby="event-date">
          <div className="grid grid-cols-[5.25rem_minmax(0,1fr)]">
            <div className="grid place-items-center bg-lime px-3 py-5 text-center text-grass">
              <CalendarDays className="size-5" aria-hidden />
              <time
                dateTime={event.starts_at}
                className="mt-2 text-2xl font-black leading-none"
              >
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  timeZone: event.team_timezone,
                }).format(new Date(event.starts_at))}
              </time>
              <span className="mt-1 text-[0.65rem] font-black uppercase tracking-wider">
                {new Intl.DateTimeFormat("pt-BR", {
                  month: "short",
                  timeZone: event.team_timezone,
                })
                  .format(new Date(event.starts_at))
                  .replace(".", "")}
              </span>
            </div>

            <div className="p-5">
              <p
                id="event-date"
                className="text-sm font-bold capitalize text-slate-900"
              >
                {formatPublicEventDate(event.starts_at, event.team_timezone)}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Clock3 className="size-4 text-emerald-700" aria-hidden />
                {startsAtLabel} às {endsAtLabel}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <ShieldCheck className="size-4 text-emerald-700" aria-hidden />
                Horário de {formatPublicEventTimeZone(event.team_timezone)}
              </p>
            </div>
          </div>
        </section>

        <section className="app-surface p-6">
          <p className="app-kicker">{publicEventKindLabels[event.kind]}</p>
          {event.opponent_name ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-grass text-lime">
                <Swords className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Adversário
                </p>
                <p className="mt-1 font-black text-slate-900">
                  {event.opponent_name}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="font-bold text-slate-900">{status.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {status.description}
            </p>
          </div>
        </section>

        {access.context ? (
          <RecognizedEventAccess context={access.context} />
        ) : (
          <section className="rounded-[1.5rem] bg-grass p-6 text-white shadow-[0_18px_45px_-28px_rgba(2,20,14,.7)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
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
              className="mt-5 min-h-12 w-full rounded-xl bg-white font-black text-grass hover:bg-emerald-50"
            >
              <Link href="/me/agenda">
                <LogIn aria-hidden /> Abrir minha agenda
              </Link>
            </Button>
          </section>
        )}

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
    <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_18px_45px_-32px_rgba(2,80,54,.45)]">
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
