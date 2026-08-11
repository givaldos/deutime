export const INTERNAL_SQUAD_BADGES = [
  { key: "shield", label: "Clássico" },
  { key: "stripes", label: "Listras" },
  { key: "sash", label: "Faixa" },
  { key: "quarters", label: "Quadrantes" },
  { key: "circle", label: "Círculo" },
  { key: "diamond", label: "Diamante" },
] as const;

export type InternalSquadBadgeKey = typeof INTERNAL_SQUAD_BADGES[number]["key"];

export type InternalSquad = {
  id: string;
  name: string;
  color: string;
  badgeKey: InternalSquadBadgeKey;
  sortOrder: number;
};
