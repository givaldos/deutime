import { BrandMark } from "@/components/brand-mark";
import { AccountProfileLink } from "@/components/account-profile-link";
import { LogoutButton } from "@/components/logout-button";
import { TeamPrimaryNavigation } from "@/components/team-primary-navigation";
import { TeamSwitcher } from "@/components/team-switcher";
import type { TeamNavigationRole } from "@/lib/navigation/team-navigation";

export function TeamAppHeader({
  currentName,
  currentSlug,
  teams,
  role,
  championshipsEnabled,
  logoUrl,
}: {
  currentName: string;
  currentSlug: string;
  teams: { name: string; slug: string }[];
  role?: TeamNavigationRole;
  championshipsEnabled?: boolean;
  logoUrl?: string | null;
}) {
  const guided = Boolean(role);
  return (
    <header className={`${guided ? "" : "legacy-team-header "}sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl`}>
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandMark
            href={`/app/${currentSlug}`}
            compact
            className={guided ? "hidden sm:inline-flex" : undefined}
          />
          {guided ? (
            logoUrl ? (
              // URL assinada e privada não entra na allowlist global do otimizador.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`Escudo do ${currentName}`} className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
            ) : (
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-900 ring-1 ring-emerald-200">
                {currentName.trim().charAt(0).toLocaleUpperCase("pt-BR") || "T"}
              </span>
            )
          ) : null}
          <TeamSwitcher
            currentName={currentName}
            currentSlug={currentSlug}
            teams={teams}
            canManageSettings={role !== "manager"}
          />
        </div>
        <div className="flex items-center gap-2">
          <TeamPrimaryNavigation
            teamSlug={currentSlug}
            role={role}
            championshipsEnabled={championshipsEnabled}
          />
          <AccountProfileLink />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
