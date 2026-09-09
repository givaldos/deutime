import { describe, expect, it } from "vitest"

import {
  getTeamMoreNavigationItems,
  getTeamNavigationItems,
  resolveLegacyBottomNavigationState,
  resolveTeamNavigationSection,
} from "./team-navigation"

describe("team navigation", () => {
  it("expõe os cinco destinos com nomes canônicos quando campeonatos está disponível", () => {
    expect(
      getTeamNavigationItems({
        teamSlug: "meu-time",
        role: "owner",
        championshipsEnabled: true,
      }),
    ).toEqual([
      { key: "home", label: "Início", href: "/app/meu-time" },
      { key: "events", label: "Jogos", href: "/app/meu-time/events" },
      {
        key: "championships",
        label: "Campeonatos",
        href: "/app/meu-time/championships",
      },
      { key: "athletes", label: "Atletas", href: "/app/meu-time/athletes" },
      { key: "more", label: "Mais", href: "/app/meu-time/more" },
    ])
  })

  it("não oferece campeonato quando a capacidade está desligada", () => {
    const items = getTeamNavigationItems({
      teamSlug: "meu-time",
      role: "manager",
      championshipsEnabled: false,
    })

    expect(items.map((item) => item.key)).toEqual(["home", "events", "athletes", "more"])
  })

  it("não promete ajustes nem acessos ao manager", () => {
    expect(
      getTeamMoreNavigationItems({ teamSlug: "meu-time", role: "manager" }),
    ).toEqual([
      { key: "profile", label: "Meu perfil", href: "/app/profile" },
      { key: "invitations", label: "Meus convites", href: "/app" },
    ])
  })

  it("oferece destinos administrativos funcionais ao owner e admin", () => {
    for (const role of ["owner", "admin"] as const) {
      const items = getTeamMoreNavigationItems({ teamSlug: "meu-time", role })
      expect(items.map((item) => item.href)).toEqual([
        "/app/meu-time/settings#internal-teams",
        "/app/meu-time/settings#team-access",
        "/app/meu-time/settings",
        "/app/profile",
        "/app",
      ])
    }
  })

  it.each([
    ["/app/meu-time", "home"],
    ["/app/meu-time/events", "events"],
    ["/app/meu-time/events/evento/edit", "events"],
    ["/app/meu-time/championships/campeonato", "championships"],
    ["/app/meu-time/athletes/atleta/edit", "athletes"],
    ["/app/meu-time/more", "more"],
    ["/app/meu-time/settings", "more"],
  ] as const)("resolve %s como %s", (pathname, expected) => {
    expect(resolveTeamNavigationSection(pathname, "meu-time")).toBe(expected)
  })

  it.each([
    "/app/meu-time-extra/events",
    "/app/meu-time/events-extra",
    "/app/outro-time/events",
    "/app/profile",
  ])("não seleciona prefixos ou outro tenant em %s", (pathname) => {
    expect(resolveTeamNavigationSection(pathname, "meu-time")).toBeNull()
  })

  it.each([
    ["/app/meu-time", "home", "proximo"],
    ["/app/meu-time/athletes", "athletes", "proximo"],
    ["/app/meu-time/events", "events", "proximo"],
    ["/app/meu-time/events/evento-a", "events", "evento-a"],
    ["/app/meu-time/settings", "settings", "proximo"],
  ] as const)("preserva o menu inferior legado em %s", (pathname, active, eventId) => {
    expect(
      resolveLegacyBottomNavigationState(pathname, "meu-time", "proximo"),
    ).toEqual({ active, eventId })
  })

  it.each([
    "/app/meu-time/events/new",
    "/app/meu-time/events/pending",
    "/app/meu-time/events/evento-a/edit",
    "/app/meu-time/events/evento-a/matches",
    "/app/meu-time/athletes/new",
    "/app/meu-time/championships",
  ])("não inventa menu inferior legado em %s", (pathname) => {
    expect(
      resolveLegacyBottomNavigationState(pathname, "meu-time", "proximo"),
    ).toBeNull()
  })
})
