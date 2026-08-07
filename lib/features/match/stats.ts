import "server-only";

export type MatchStat = { athlete_id: string; goals: number; assists: number; yellow: number; red: number };

export function deriveStats(events: { kind: string; athlete_id: string | null; assist_athlete_id: string | null; status: string }[]): Map<string, MatchStat> {
  const map = new Map<string, MatchStat>();
  for (const e of events) {
    if (e.status !== "finalized") continue;
    if (e.kind === "goal" && e.athlete_id) {
      const s = map.get(e.athlete_id) ?? { athlete_id: e.athlete_id, goals:0, assists:0, yellow:0, red:0 };
      s.goals++; map.set(e.athlete_id, s);
    }
    if (e.assist_athlete_id) {
      const s = map.get(e.assist_athlete_id) ?? { athlete_id: e.assist_athlete_id, goals:0, assists:0, yellow:0, red:0 };
      s.assists++; map.set(e.assist_athlete_id, s);
    }
    if (e.kind === "yellow_card" && e.athlete_id) {
      const s = map.get(e.athlete_id) ?? { athlete_id: e.athlete_id, goals:0, assists:0, yellow:0, red:0 };
      s.yellow++; map.set(e.athlete_id, s);
    }
    if (e.kind === "red_card" && e.athlete_id) {
      const s = map.get(e.athlete_id) ?? { athlete_id: e.athlete_id, goals:0, assists:0, yellow:0, red:0 };
      s.red++; map.set(e.athlete_id, s);
    }
  }
  return map;
}
