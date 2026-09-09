"use client";

import { CalendarDays, Home, Menu, NotebookTabs, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getTeamNavigationItems,
  resolveTeamNavigationSection,
  type TeamNavigationKey,
  type TeamNavigationRole,
} from "@/lib/navigation/team-navigation";

const items = [
  { key: "home", label: "Início", icon: Home },
  { key: "events", label: "Agenda", icon: CalendarDays },
  { key: "athletes", label: "Atletas", icon: UsersRound },
  { key: "match", label: "Súmula", icon: NotebookTabs },
] as const;

export function TeamBottomNav({
  teamSlug,
  active,
  nextEventId,
  role,
  championshipsEnabled,
}: {
  teamSlug: string;
  active?: (typeof items)[number]["key"] | "settings";
  nextEventId?: string | null;
  role?: TeamNavigationRole;
  championshipsEnabled?: boolean;
}) {
  const pathname = usePathname();

  if (role) {
    const guidedItems = getTeamNavigationItems({
      teamSlug,
      role,
      championshipsEnabled: championshipsEnabled === true,
    });
    const activeSection = resolveTeamNavigationSection(pathname, teamSlug);
    const guidedIcons = {
      home: Home,
      events: CalendarDays,
      championships: Trophy,
      athletes: UsersRound,
      more: Menu,
    } satisfies Record<TeamNavigationKey, typeof Home>;

    return (
      <nav
        aria-label="Navegação principal do time"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto grid max-w-md rounded-[1.5rem] border border-white/10 bg-grass/95 p-1 shadow-float backdrop-blur-xl",
            guidedItems.length === 5 ? "grid-cols-5" : "grid-cols-4",
          )}
        >
          {guidedItems.map((item) => {
            const Icon = guidedIcons[item.key];
            const selected = item.key === activeSection;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-14 min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-[1.1rem] px-0.5 text-center text-[9px] font-bold leading-none transition-colors sm:text-[10px] [-webkit-tap-highlight-color:transparent] active:bg-white/10 ${selected ? "bg-white text-graphite shadow-sm active:bg-white" : "text-slate-300"}`}
              >
                <Icon className={`size-5 shrink-0 ${selected ? "text-emerald-600" : ""}`} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  const hrefs = {
    home: `/app/${teamSlug}`,
    athletes: `/app/${teamSlug}/athletes`,
    events: `/app/${teamSlug}/events`,
    match: nextEventId
      ? `/app/${teamSlug}/events/${nextEventId}/match`
      : `/app/${teamSlug}/events`,
  };

  return (
    <nav
      aria-label="Navegação principal do time"
      className="legacy-team-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden"
    >
      <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 rounded-[1.5rem] border border-white/10 bg-grass/95 p-1 shadow-float backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.key === active;
          return (
            <Link
              key={item.key}
              href={hrefs[item.key]}
              aria-current={selected ? "page" : undefined}
              className={`flex h-14 w-full touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[10px] font-bold transition-colors [-webkit-tap-highlight-color:transparent] active:bg-white/10 ${selected ? "bg-white text-graphite shadow-sm active:bg-white" : "text-slate-300"}`}
            >
              <Icon className={`size-5 ${selected ? "text-emerald-600" : ""}`} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
