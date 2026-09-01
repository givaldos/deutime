export function shouldUseProfessionalCreationActions({
  role,
  professionalSchedulingEnabled,
  championshipsEnabled,
}: {
  role: string | null | undefined;
  professionalSchedulingEnabled: boolean;
  championshipsEnabled: boolean;
}) {
  return (
    professionalSchedulingEnabled &&
    championshipsEnabled &&
    (role === "owner" || role === "admin")
  );
}

export function getChampionshipCreationStep({
  status,
  participantCount,
  fixtureCount,
}: {
  status: string;
  participantCount: number;
  fixtureCount: number;
}): 2 | 5 | 6 | 7 {
  if (status !== "draft") return 7;
  if (participantCount < 2) return 2;
  if (fixtureCount === 0) return 5;
  return 6;
}
