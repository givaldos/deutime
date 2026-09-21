import { AppContainer } from "@/components/ui/app-shell";

function Skeleton({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ChampionshipLoading() {
  return (
    <main className="app-canvas min-h-screen pb-16">
      <AppContainer className="space-y-5 pb-12">
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Carregando campeonato
        </p>
        <div aria-hidden="true" className="space-y-5">
          <Skeleton className="h-11 w-32" />
          <section className="rounded-[2rem] bg-emerald-950 p-6 sm:p-8">
            <Skeleton className="size-12 bg-white/15" />
            <Skeleton className="mt-6 h-3 w-28 bg-white/15" />
            <Skeleton className="mt-3 h-9 w-3/4 max-w-md bg-white/15" />
          </section>
          <section className="app-surface p-2">
            <Skeleton className="h-11 w-full" />
          </section>
          <section className="app-surface space-y-4 p-5 sm:p-7">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-52 max-w-full" />
            <Skeleton className="h-24 w-full" />
          </section>
        </div>
      </AppContainer>
    </main>
  );
}
