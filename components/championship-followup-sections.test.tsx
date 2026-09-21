import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/championship-forms", () => ({
  KnockoutResolutionForm: () => <div>Resolver confronto</div>,
  GroupAdvanceControl: () => <div>Montar mata-mata com classificados</div>,
  LinkFixtureForm: () => <div>Vincular partida</div>,
  QualifierDecisionForm: () => <div>Motivo auditável</div>,
  ReleaseFixtureForm: () => <div>Liberar para remarcação</div>,
  WithdrawParticipantForm: () => <div>Registrar retirada</div>,
}));
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
    const html = renderToStaticMarkup(<ChampionshipMatchesView {...base} teamId="11111111-1111-4111-8111-111111111111" filters={{ stage: "group", groupNumber: 2, roundNumber: 3, view: "unscheduled" }} page={{ items: [{ id: "44444444-4444-4444-8444-444444444444", stage: "group", group_number: 2, round_number: 3, ordinal: 1, status: "scheduled", situation: "unscheduled", match_id: null, event_id: null, event_title: null, starts_at: null, side_a: "Verdes", side_b: "A definir" }], filtered_count: 25, next_cursor: { stage_rank: 2, group_number: 2, round_number: 3, ordinal: 1, id: "44444444-4444-4444-8444-444444444444" }, effective_filters: {} }} canOperate actionContext={null} />);
    expect(html).toContain("Filtrar jogos");
    expect(html).toContain("Verdes × A definir");
    expect(html).toContain("Data ainda não definida");
    expect(html).toContain("Próxima página");
    expect(html).toContain("Gerenciar confronto");
    expect(html).toContain('aria-current="page"');
  });

  it("carrega ações do confronto somente no item selecionado", () => {
    const fixtureId = "44444444-4444-4444-8444-444444444444";
    const html = renderToStaticMarkup(<ChampionshipMatchesView {...base} teamId="11111111-1111-4111-8111-111111111111" filters={{ stage: "knockout", groupNumber: null, roundNumber: 1, view: "all" }} page={{ items: [{ id: fixtureId, stage: "knockout", group_number: null, round_number: 1, ordinal: 1, status: "scheduled", situation: "unscheduled", match_id: null, event_id: null, event_title: null, starts_at: null, side_a: "Verdes", side_b: "Azuis" }], filtered_count: 1, next_cursor: null, effective_filters: {} }} canOperate actionContext={{ fixtureId, stage: "knockout", fixtureStatus: "scheduled", matchStatus: null, canRelease: false, currentWinnerId: null, sides: [{ id: standing.participant_id, name: "Verdes" }, { id: "55555555-5555-4555-8555-555555555555", name: "Azuis" }], matches: [] }} />);
    expect(html).toContain("Ações do confronto");
    expect(html).toContain("Vincular partida");
    expect(html).toContain("Resolver confronto");
  });

  it("mostra uma tabela por grupo e preserva o grupo na URL", () => {
    const html = renderToStaticMarkup(<ChampionshipStandingsView {...base} teamId="11111111-1111-4111-8111-111111111111" championship={{ ...championship, format: "groups_knockout" }} standings={[{ ...standing, group_number: 1, participant_seed: 1 }, { ...standing, participant_id: "55555555-5555-4555-8555-555555555555", participant_name: "Azuis", group_number: 2, participant_seed: 2 }]} knockoutPage={null} groupNumber={2} canConfigure advanceContext={{ groupsClosed: true, pendingDecisions: [{ groupNumber: 2, qualifierPosition: 1, candidates: [{ id: standing.participant_id, name: "Verdes" }] }] }} />);
    expect(html).toContain("Grupo B");
    expect(html).toContain("Azuis");
    expect(html).not.toContain(">Verdes<");
    expect(html).toContain("group=2");
    expect(html).toContain("Motivo auditável");
    expect(html).toContain("Montar mata-mata com classificados");
  });

  it("lista somente snapshots esportivos das equipes", () => {
    const html = renderToStaticMarkup(<ChampionshipTeamsView teamId="11111111-1111-4111-8111-111111111111" teamSlug="campo-fc" returnTo={null} championship={championship} participants={[{ id: standing.participant_id, snapshot_name: "Verdes", snapshot_color: "#008000", snapshot_badge_key: "shield", seed: 1, group_number: null, status: "active" }]} canConfigure />);
    expect(html).toContain("Identidade preservada");
    expect(html).toContain("Verdes");
    expect(html).toContain("Seed #1");
    expect(html).toContain("Ativa");
    expect(html).toContain("Registrar retirada");
  });

  it("não oferece retirada de equipe para manager", () => {
    const html = renderToStaticMarkup(<ChampionshipTeamsView teamId="11111111-1111-4111-8111-111111111111" teamSlug="campo-fc" returnTo={null} championship={championship} participants={[{ id: standing.participant_id, snapshot_name: "Verdes", snapshot_color: "#008000", snapshot_badge_key: "shield", seed: 1, group_number: null, status: "active" }]} canConfigure={false} />);
    expect(html).toContain("somente para consulta");
    expect(html).not.toContain("Registrar retirada");
  });
});
