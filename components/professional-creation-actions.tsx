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
    title: "Dê nome ao campeonato",
    description: "Escolha o nome e o formato. Você poderá voltar antes de continuar.",
  },
  2: {
    title: "Escolha as regras",
    description: "Defina pontuação, grupos e a ordem dos critérios de desempate.",
  },
  3: {
    title: "Escolha as equipes",
    description: "Selecione pelo menos duas equipes que disputarão o campeonato.",
  },
  4: {
    title: "Distribua os convocados",
    description: "Escolha em qual equipe cada atleta vai jogar neste campeonato.",
  },
  5: {
    title: "Acerte a agenda e conclua",
    description: "Informe a primeira data e confira os jogos antes de criar a agenda e publicar.",
  },
} as const;

export function ChampionshipCreationProgress({
  currentStep = 1,
}: {
  currentStep?: keyof typeof championshipProgressCopy;
}) {
  const steps = [
    "Campeonato",
    "Regras",
    "Equipes",
    "Convocados",
    "Agenda",
  ];

  const copy = championshipProgressCopy[currentStep];

  return (
    <section
      aria-labelledby="championship-progress-title"
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
    >
      <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
        Etapa {currentStep} de 5
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
