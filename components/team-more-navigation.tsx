import {
  ChevronRight,
  MailCheck,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import {
  getTeamMoreNavigationItems,
  type TeamMoreNavigationItem,
  type TeamNavigationRole,
} from "@/lib/navigation/team-navigation";

const itemPresentation = {
  "internal-teams": {
    icon: UsersRound,
    description: "Organize os lados que entram em campo.",
  },
  "team-access": {
    icon: ShieldCheck,
    description: "Convide e acompanhe quem ajuda na organização.",
  },
  "team-settings": {
    icon: Settings,
    description: "Atualize identidade, página pública e preferências.",
  },
  profile: {
    icon: UserRound,
    description: "Altere seus dados pessoais e de acesso.",
  },
  invitations: {
    icon: MailCheck,
    description: "Veja os convites recebidos para outros times.",
  },
} satisfies Record<
  TeamMoreNavigationItem["key"],
  { icon: typeof Settings; description: string }
>;

export function TeamMoreNavigation({
  teamSlug,
  role,
}: {
  teamSlug: string;
  role: TeamNavigationRole;
}) {
  const items = getTeamMoreNavigationItems({ teamSlug, role });

  return (
    <nav aria-label="Outras áreas do time">
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const presentation = itemPresentation[item.key];
          const Icon = presentation.icon;

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className="app-surface group flex min-h-24 items-center gap-4 p-4 transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-graphite">{item.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {presentation.description}
                  </span>
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
