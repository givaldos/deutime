"use client";

import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { CalendarDays, Home, Medal, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const baseItems = [
  {
    href: "/me",
    label: "Início",
    mobileLabel: "Início",
    icon: Home,
    matches: (path: string) => path === "/me",
  },
  {
    href: "/me/agenda",
    label: "Agenda",
    mobileLabel: "Agenda",
    icon: CalendarDays,
    matches: (path: string) => path.startsWith("/me/agenda"),
  },
  {
    href: "/me/perfil",
    label: "Perfil",
    mobileLabel: "Perfil",
    icon: UserRound,
    matches: (path: string) => path.startsWith("/me/perfil"),
  },
] as const;

export function PlayerPortalNavigation({
  recognitionEnabled = false,
}: {
  recognitionEnabled?: boolean;
}) {
  const pathname = usePathname();
  const items = recognitionEnabled
    ? [
        ...baseItems.slice(0, 2),
        {
          href: "/me/reconhecimentos",
          label: "Reconhecimentos",
          mobileLabel: "Reconhec.",
          icon: Medal,
          matches: (path: string) => path.startsWith("/me/reconhecimentos"),
        },
        baseItems[2],
      ]
    : baseItems;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark href="/me" compact />
            <span className="truncate text-sm font-bold text-slate-700">Seu futebol</span>
          </div>

          <div className="flex items-center gap-2">
            <nav aria-label="Área do atleta" className="hidden sm:flex sm:items-center sm:gap-1">
              {items.map((item) => {
                const selected = item.matches(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                      selected
                        ? "bg-grass text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <LogoutButton />
          </div>
        </div>
      </header>

      <nav
        aria-label="Área do atleta"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden"
      >
        <div
          className={`pointer-events-auto mx-auto grid max-w-md rounded-[1.5rem] border border-white/10 bg-grass/95 p-1 shadow-float backdrop-blur-xl ${
            recognitionEnabled ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          {items.map((item) => {
            const selected = item.matches(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={selected ? "page" : undefined}
                className={`flex h-14 w-full touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[10px] font-bold transition-colors [-webkit-tap-highlight-color:transparent] active:bg-white/10 ${
                  selected
                    ? "bg-white text-graphite shadow-sm active:bg-white"
                    : "text-slate-300"
                }`}
              >
                <item.icon className={`size-5 ${selected ? "text-emerald-600" : ""}`} aria-hidden />
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
