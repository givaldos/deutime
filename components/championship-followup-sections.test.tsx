import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  ChampionshipMatchesView,
  ChampionshipStandingsView,
  ChampionshipTeamsView,
} from "./championship-followup-sections";

const championship = { id: "22222222-2222-4222-8222-222222222222", name: "Copa", format: "league" as const, status: "active" as const, status_label: "Em andamento", public_mode: "private" as const };
const base = { teamSlug: "campo-fc", timeZone: "America/Sao_Paulo", returnTo: null, championship };
const standing = { rank_position: 1, participant_id: "33333333-3333-4333-8333-333333333333", participant_name: "Verdes", participant_color: "#008000", participant_badge_key: "shield" as const, played: 2, wins: 2, draws: 0, losses: 0, goals_for: 5, goals_against: 1, goal_difference: 4, points: 6, head_to_head_points: 0 };

describe("seções do acompanhamento", () => {
  it("mostra filtros, estado a agendar e paginação em Jogos", () => {
    const html = renderToStaticMarkup(<ChampionshipMatchesView {...base} filters={{ stage: "group", groupNumber: 2, roundNumber: 3, view: "unscheduled" }} page={{ items: [{ id: "44444444-4444-4444-8444-444444444444", stage: "group", group_number: 2, round_number: 3, ordinal: 1, status: "scheduled", situation: "unscheduled", match_id: null, event_id: null, event_title: null, starts_at: null, side_a: "Verdes", side_b: "A definir" }], filtered_count: 25, next_cursor: { stage_rank: 2, group_number: 2, round_number: 3, ordinal: 1, id: "44444444-4444-4444-8444-444444444444" }, effective_filters: {} }} />);
    expect(html).toContain("Filtrar jogos");
    expect(html).toContain("Verdes × A definir");
    expect(html).toContain("Data ainda não definida");
    expect(html).toContain("Próxima página");
    expect(html).toContain('aria-current="page"');
  });

  it("mostra uma tabela por grupo e preserva o grupo na URL", () => {
    const html = renderToStaticMarkup(<ChampionshipStandingsView {...base} championship={{ ...championship, format: "groups_knockout" }} standings={[{ ...standing, group_number: 1, participant_seed: 1 }, { ...standing, participant_id: "55555555-5555-4555-8555-555555555555", participant_name: "Azuis", group_number: 2, participant_seed: 2 }]} knockoutPage={null} groupNumber={2} />);
    expect(html).toContain("Grupo B");
    expect(html).toContain("Azuis");
    expect(html).not.toContain(">Verdes<");
    expect(html).toContain("group=2");
  });

  it("lista somente snapshots esportivos das equipes", () => {
    const html = renderToStaticMarkup(<ChampionshipTeamsView teamSlug="campo-fc" returnTo={null} championship={championship} participants={[{ id: standing.participant_id, snapshot_name: "Verdes", snapshot_color: "#008000", snapshot_badge_key: "shield", seed: 1, group_number: null, status: "active" }]} />);
    expect(html).toContain("Identidade preservada");
    expect(html).toContain("Verdes");
    expect(html).toContain("Seed #1");
    expect(html).toContain("Ativa");
  });
});
