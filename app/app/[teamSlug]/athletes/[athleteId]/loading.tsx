import { AppContainer } from "@/components/ui/app-shell";

function SkeletonLine({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded-full bg-slate-200 ${className}`} />;
}

export default function AthleteDetailLoading() {
  return (
    <main className="app-canvas pb-24">
      <AppContainer>
        <section
          aria-label="Carregando detalhes do atleta"
          aria-busy="true"
          aria-live="polite"
          role="status"
          className="mx-auto max-w-3xl py-6 sm:py-10"
        >
          <h1 className="sr-only">Detalhes do atleta</h1>
          <span className="sr-only">Carregando detalhes do atleta...</span>
          <div aria-hidden="true" className="space-y-5">
            <SkeletonLine className="h-11 w-40" />
            <div className="flex flex-col items-start gap-4 min-[360px]:flex-row min-[360px]:items-center">
              <SkeletonLine className="size-20 shrink-0 rounded-3xl sm:size-24" />
              <div className="w-full space-y-3">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-8 w-64 max-w-full" />
                <SkeletonLine className="h-7 w-36" />
              </div>
            </div>
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="app-surface space-y-4 p-5 sm:p-6">
                <SkeletonLine className="h-6 w-48 max-w-full" />
                <SkeletonLine className="h-4 w-full" />
                <SkeletonLine className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </section>
      </AppContainer>
    </main>
  );
}
