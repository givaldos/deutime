import { Button } from "@/components/ui/button";
import { AppContainer, Metric, PageHeader } from "@/components/ui/app-shell";
import { requireUser } from "@/lib/auth/dal";
import {
  getMyRecognitions,
  getRecognitionAvailability,
  type Recognition,
} from "@/lib/data/recognition";
import { recognitionCatalog } from "@/lib/features/recognition/catalog";
import {
  ArrowLeft,
  Goal,
  Handshake,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reconhecimentos",
  robots: { index: false, follow: false },
};

const presentation = {
  goal_recorded: {
    description: "Seu gol foi confirmado na súmula finalizada.",
    icon: Goal,
    tone: "bg-emerald-50 text-emerald-700",
  },
  assist_recorded: {
    description: "Sua assistência foi confirmada na súmula finalizada.",
    icon: Handshake,
    tone: "bg-sky-50 text-sky-700",
  },
  crowd_star: {
    description: "Resultado agregado depois do encerramento da votação.",
    icon: Star,
    tone: "bg-amber-50 text-amber-700",
  },
} as const;

function RecognitionFallback() {
  return (
    <AppContainer narrow>
      <PageHeader
        eyebrow="Seu futebol"
        title="Reconhecimentos"
        description="Esta visão ainda não está disponível para seus times."
      />
      <section
        data-testid="recognition-fallback"
        className="app-surface border-dashed p-6 text-center sm:p-8"
      >
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <ShieldCheck className="size-7" aria-hidden />
        </div>
        <h2 className="mt-5 text-lg font-black">Seu perfil continua normal</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Perfil, estatísticas e o resultado do Craque da Galera continuam
          funcionando. Quando esta visão for liberada para um dos seus times,
          ela aparecerá aqui automaticamente.
        </p>
        <Button asChild variant="outline" className="mt-6 h-11 rounded-xl">
          <Link href="/me/perfil">
            <ArrowLeft aria-hidden /> Voltar ao perfil
          </Link>
        </Button>
      </section>
    </AppContainer>
  );
}

function RecognitionCard({ recognition }: { recognition: Recognition }) {
  const item = presentation[recognition.kind];
  const ItemIcon = item.icon;

  return (
    <li>
      <article className="app-surface p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${item.tone}`}
          >
            <ItemIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {recognition.team_name}
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight">
              {recognitionCatalog[recognition.kind].label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-800">
                {recognition.event_title}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Partida {recognition.match_ordinal} ·{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "medium",
                  timeZone: "America/Sao_Paulo",
                }).format(new Date(recognition.recognized_at))}
              </p>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export default async function RecognitionsPage() {
  await requireUser();
  const enabled = await getRecognitionAvailability();
  if (!enabled) return <RecognitionFallback />;

  const recognitions = await getMyRecognitions();
  if (recognitions === null) return <RecognitionFallback />;

  const counts = {
    goal_recorded: recognitions.filter(
      (recognition) => recognition.kind === "goal_recorded",
    ).length,
    assist_recorded: recognitions.filter(
      (recognition) => recognition.kind === "assist_recorded",
    ).length,
    crowd_star: recognitions.filter(
      (recognition) => recognition.kind === "crowd_star",
    ).length,
  };

  return (
    <AppContainer narrow>
      <PageHeader
        eyebrow="Seu futebol"
        title="Reconhecimentos"
        description="Momentos positivos confirmados pelos fatos das suas partidas."
        action={
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Medal className="size-6" aria-hidden />
          </span>
        }
      />

      <section
        data-testid="recognition-private-view"
        className="relative overflow-hidden rounded-[2rem] bg-grass p-6 text-white shadow-float sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            Só para você
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Seu jogo deixa boas marcas
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100">
            Cada cartão vem de uma partida encerrada. Não há pontos, notas,
            sequência ou ranking entre atletas.
          </p>
        </div>
      </section>

      <section
        aria-label="Resumo dos reconhecimentos"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
      >
        <Metric
          value={recognitions.length}
          label="Reconhecimentos"
          icon={Sparkles}
        />
        <Metric value={counts.goal_recorded} label="Gols" icon={Goal} />
        <Metric
          value={counts.assist_recorded}
          label="Assistências"
          icon={Handshake}
          tone="sky"
        />
        <Metric
          value={counts.crowd_star}
          label="Craque da Galera"
          icon={Star}
          tone="amber"
        />
      </section>

      {recognitions.length ? (
        <ol aria-label="Seus cartões" className="space-y-3">
          {recognitions.map((recognition) => (
            <RecognitionCard
              key={`${recognition.kind}:${recognition.source_id}`}
              recognition={recognition}
            />
          ))}
        </ol>
      ) : (
        <section
          data-testid="recognition-empty-state"
          className="app-surface border-dashed p-7 text-center sm:p-8"
        >
          <Trophy className="mx-auto size-9 text-slate-400" aria-hidden />
          <h2 className="mt-4 text-lg font-black">Os próximos vêm do jogo</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Quando uma partida elegível for encerrada, seus gols, assistências
            ou resultado do Craque da Galera aparecerão aqui.
          </p>
        </section>
      )}

      <section className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Esta lista é privada. Uma futura publicação de resumo exigirá uma
          escolha separada sua e nunca mostrará partida, data ou voto.
        </p>
      </section>
    </AppContainer>
  );
}
