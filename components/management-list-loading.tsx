import { AppContainer } from "@/components/ui/app-shell";

function SkeletonLine({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded-full bg-slate-200 ${className}`} />;
}

export function ManagementListLoading({ resource }: { resource: "jogos" | "campeonatos" }) {
  const title = resource === "jogos" ? "Jogos" : "Campeonatos";

  return (
    <main className="app-canvas pb-24">
      <AppContainer>
        <section
          aria-label={`Carregando ${resource}`}
          aria-busy="true"
          aria-live="polite"
          role="status"
        >
          <span className="sr-only">Carregando {resource}...</span>
          <div aria-hidden="true" className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-3">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-8 w-40" />
                <SkeletonLine className="h-4 w-64 max-w-full" />
              </div>
              <SkeletonLine className="h-11 w-24" />
            </div>
            <div className="app-surface space-y-4 p-4 sm:p-5">
              <SkeletonLine className="h-5 w-44" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => <SkeletonLine key={index} className="h-11 w-full rounded-xl" />)}
              </div>
              <SkeletonLine className="h-11 w-full sm:w-36" />
            </div>
            <section aria-label={`Lista de ${resource}`}>
              <h1 className="sr-only">{title}</h1>
              <div className="space-y-3">
                <SkeletonLine className="h-6 w-52" />
                <div className="grid gap-3 lg:grid-cols-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="app-surface space-y-4 p-4 sm:p-5">
                      <SkeletonLine className="h-4 w-28" />
                      <SkeletonLine className="h-6 w-3/4" />
                      <SkeletonLine className="h-4 w-full" />
                      <SkeletonLine className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </AppContainer>
    </main>
  );
}
