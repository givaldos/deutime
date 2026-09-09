export type TeamNavigationRole = "owner" | "admin" | "manager"

export type TeamNavigationKey =
  | "home"
  | "events"
  | "championships"
  | "athletes"
  | "more"

export type TeamNavigationItem = {
  key: TeamNavigationKey
  label: string
  href: string
}

export type TeamMoreNavigationItem = {
  key: "internal-teams" | "team-access" | "team-settings" | "profile" | "invitations"
  label: string
  href: string
}

export type LegacyBottomNavigationState = {
  active: "home" | "events" | "athletes" | "settings"
  eventId: string | null
}

function teamBasePath(teamSlug: string) {
  return `/app/${teamSlug}`
}

export function getTeamNavigationItems({
  teamSlug,
  championshipsEnabled,
}: {
  teamSlug: string
  role: TeamNavigationRole
  championshipsEnabled: boolean
}): TeamNavigationItem[] {
  const basePath = teamBasePath(teamSlug)

  return [
    { key: "home", label: "Início", href: basePath },
    { key: "events", label: "Jogos", href: `${basePath}/events` },
    ...(championshipsEnabled
      ? [{ key: "championships" as const, label: "Campeonatos", href: `${basePath}/championships` }]
      : []),
    { key: "athletes", label: "Atletas", href: `${basePath}/athletes` },
    { key: "more", label: "Mais", href: `${basePath}/more` },
  ]
}

export function getTeamMoreNavigationItems({
  teamSlug,
  role,
}: {
  teamSlug: string
  role: TeamNavigationRole
}): TeamMoreNavigationItem[] {
  const basePath = teamBasePath(teamSlug)
  const administrativeItems: TeamMoreNavigationItem[] =
    role === "manager"
      ? []
      : [
          {
            key: "internal-teams",
            label: "Equipes",
            href: `${basePath}/settings#internal-teams`,
          },
          {
            key: "team-access",
            label: "Diretoria e acessos",
            href: `${basePath}/settings#team-access`,
          },
          {
            key: "team-settings",
            label: "Ajustes do time",
            href: `${basePath}/settings`,
          },
        ]

  return [
    ...administrativeItems,
    { key: "profile", label: "Meu perfil", href: "/app/profile" },
    { key: "invitations", label: "Meus convites", href: "/app" },
  ]
}

export function resolveTeamNavigationSection(
  pathname: string,
  teamSlug: string,
): TeamNavigationKey | null {
  const basePath = teamBasePath(teamSlug)
  if (pathname === basePath) return "home"
  if (pathname === `${basePath}/more` || pathname.startsWith(`${basePath}/more/`)) return "more"
  if (pathname === `${basePath}/settings` || pathname.startsWith(`${basePath}/settings/`)) return "more"
  if (pathname === `${basePath}/events` || pathname.startsWith(`${basePath}/events/`)) return "events"
  if (
    pathname === `${basePath}/championships` ||
    pathname.startsWith(`${basePath}/championships/`)
  ) {
    return "championships"
  }
  if (pathname === `${basePath}/athletes` || pathname.startsWith(`${basePath}/athletes/`)) {
    return "athletes"
  }
  return null
}

export function resolveLegacyBottomNavigationState(
  pathname: string,
  teamSlug: string,
  nextEventId: string | null,
): LegacyBottomNavigationState | null {
  const basePath = teamBasePath(teamSlug)
  if (pathname === basePath) return { active: "home", eventId: nextEventId }
  if (pathname === `${basePath}/athletes`) {
    return { active: "athletes", eventId: nextEventId }
  }
  if (pathname === `${basePath}/settings`) {
    return { active: "settings", eventId: nextEventId }
  }
  if (pathname === `${basePath}/events`) {
    return { active: "events", eventId: nextEventId }
  }

  const eventDetailMatch = pathname.match(
    new RegExp(`^${escapeRegExp(basePath)}/events/([^/]+)$`),
  )
  const eventId = eventDetailMatch?.[1]
  if (eventId && eventId !== "new" && eventId !== "pending") {
    return { active: "events", eventId }
  }

  return null
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
