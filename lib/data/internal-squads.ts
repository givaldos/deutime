import type { InternalSquad, InternalSquadBadgeKey } from "@/lib/features/team-division/internal-squads";
import { createClient } from "@/lib/supabase/server";

export type InternalSquadConfiguration = {
  squads: InternalSquad[];
  defaultHomeTeamId: string | null;
  defaultAwayTeamId: string | null;
};

export async function getInternalSquads(teamId: string): Promise<InternalSquad[]> {
  const supabase = await createClient();
  const base = await supabase
    .from("team_squad_presets")
    .select("id, name, color, sort_order")
    .eq("team_id", teamId)
    .order("sort_order");
  if (base.error) throw new Error("Não foi possível carregar as equipes internas.");

  const enhanced = await supabase
    .from("team_squad_presets")
    .select("id, name, color, badge_key, sort_order")
    .eq("team_id", teamId)
    .order("sort_order");
  const rows = enhanced.error ? base.data : enhanced.data;

  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    badgeKey: ("badge_key" in row ? row.badge_key : "shield") as InternalSquadBadgeKey,
    sortOrder: row.sort_order,
  }));
}

export async function getInternalSquadConfiguration(
  teamId: string,
): Promise<InternalSquadConfiguration> {
  const supabase = await createClient();
  const [squads, { data, error }] = await Promise.all([
    getInternalSquads(teamId),
    supabase
      .from("team_professional_scheduling_settings")
      .select("default_home_team_id, default_away_team_id")
      .eq("team_id", teamId)
      .maybeSingle(),
  ]);
  if (error) throw new Error("Não foi possível carregar os padrões do time.");

  const activeIds = new Set(squads.map((squad) => squad.id));
  return {
    squads,
    defaultHomeTeamId:
      data?.default_home_team_id && activeIds.has(data.default_home_team_id)
        ? data.default_home_team_id
        : null,
    defaultAwayTeamId:
      data?.default_away_team_id && activeIds.has(data.default_away_team_id)
        ? data.default_away_team_id
        : null,
  };
}
