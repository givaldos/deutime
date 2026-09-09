"use client";

import { CalendarDays, Home, Menu, Settings, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getTeamNavigationItems,
  resolveTeamNavigationSection,
  type TeamNavigationKey,
  type TeamNavigationRole,
} from "@/lib/navigation/team-navigation";

const guidedIcons = {
  home: Home,
  events: CalendarDays,
  championships: Trophy,
  athletes: UsersRound,
  more: Menu,
} satisfies Record<TeamNavigationKey, typeof Home>;

export function TeamPrimaryNavigation({
  teamSlug,
  role,
  championshipsEnabled,
}: {
  teamSlug: string;
  role?: TeamNavigationRole;
  championshipsEnabled?: boolean;
}) {
  const pathname = usePathname();
  if (role) {
    const activeSection = resolveTeamNavigationSection(pathname, teamSlug);
    const guidedItems = getTeamNavigationItems({
      teamSlug,
      role,
      championshipsEnabled: championshipsEnabled === true,
    });

    return (
      <nav aria-label="Navegação principal do time" className="hidden items-center gap-1 lg:flex">
        {guidedItems.map((item) => {
          const Icon = guidedIcons[item.key];
          const selected = item.key === activeSection;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                selected
                  ? "bg-grass text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-graphite"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const items = [
    {
      href: `/app/${teamSlug}`,
      label: "Visão geral",
      icon: Home,
      selected: pathname === `/app/${teamSlug}`,
    },
    {
      href: `/app/${teamSlug}/athletes`,
      label: "Atletas",
      icon: UsersRound,
      selected: pathname.startsWith(`/app/${teamSlug}/athletes`),
    },
    {
      href: `/app/${teamSlug}/events`,
      label: "Agenda",
      icon: CalendarDays,
      selected: pathname.startsWith(`/app/${teamSlug}/events`),
    },
    {
      href: `/app/${teamSlug}/settings`,
      label: "Ajustes",
      icon: Settings,
      selected: pathname.startsWith(`/app/${teamSlug}/settings`),
    },
  ];

  return (
    <nav aria-label="Administração do time" className="hidden items-center gap-1 lg:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.selected ? "page" : undefined}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
            item.selected
              ? "bg-grass text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-graphite"
          }`}
        >
          <item.icon className="size-4" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
