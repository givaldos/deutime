import { CalendarPlus, ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";

export function ProfessionalCreationActions({
  teamSlug,
}: {
  teamSlug: string;
}) {
  return (
    <section aria-labelledby="creation-actions-title">
      <div>
        <p className="app-kicker">Criar</p>
        <h2
          id="creation-actions-title"
          className="mt-1 text-xl font-black text-graphite"
        >
          O que você vai organizar?
        </h2>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/app/${teamSlug}/events/new`}
          className="app-surface group flex min-h-28 items-center gap-4 p-4 transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
            <CalendarPlus className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-graphite">Novo jogo</span>
            <span className="mt-1 block text-sm leading-5 text-slate-600">
              Um jogo ou uma série recorrente
            </span>
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>

        <Link
          href={`/app/${teamSlug}/championships?new=1`}
          className="app-surface group flex min-h-28 items-center gap-4 p-4 transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <Trophy className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-graphite">
              Novo campeonato
            </span>
            <span className="mt-1 block text-sm leading-5 text-slate-600">
              Tabela, grupos ou mata-mata
            </span>
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
}

const championshipProgressCopy = {
  1: {
    title: "Comece pelo rascunho",
    description:
      "Ao criar o rascunho, seu progresso fica salvo. Você pode sair e continuar as próximas etapas depois.",
  },
  2: {
    title: "Escolha as equipes",
    description:
      "Identidade, formato e regras já estão salvos no rascunho. Adicione ao menos duas equipes para continuar.",
  },
  5: {
    title: "Monte o calendário",
    description:
      "Equipes, formato e regras estão salvos. Gere os confrontos para revisar o calendário antes da publicação.",
  },
  6: {
    title: "Revise os jogos",
    description:
      "O calendário está salvo no rascunho. Revise os confrontos e publique quando estiver tudo certo.",
  },
  7: {
    title: "Campeonato publicado",
    description:
      "A configuração e os confrontos publicados permanecem registrados no campeonato.",
  },
} as const;

export function ChampionshipCreationProgress({
  currentStep = 1,
}: {
  currentStep?: keyof typeof championshipProgressCopy;
}) {
  const steps = [
    "Identidade",
    "Equipes",
    "Formato",
    "Regras",
    "Calendário",
    "Revisão",
    "Publicação",
  ];

  const copy = championshipProgressCopy[currentStep];

  return (
    <section
      aria-labelledby="championship-progress-title"
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
    >
      <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
        Etapa {currentStep} de 7
      </p>
      <h2
        id="championship-progress-title"
        className="mt-1 font-black text-emerald-950"
      >
        {copy.title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-emerald-900">
        {copy.description}
      </p>
      <ol
        aria-label="Etapas da criação do campeonato"
        className="mt-3 flex gap-2 overflow-x-auto pb-1"
      >
        {steps.map((step, index) => (
          <li
            key={step}
            aria-current={index + 1 === currentStep ? "step" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-bold ${
              index + 1 === currentStep
                ? "bg-emerald-800 text-white"
                : index + 1 < currentStep
                  ? "bg-emerald-100 text-emerald-950"
                : "border border-emerald-200 bg-white text-emerald-900"
            }`}
          >
            <span aria-hidden>{index + 1}</span>
            {step}
            {index + 1 < currentStep ? (
              <span className="sr-only"> concluída</span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
