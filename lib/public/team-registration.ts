import { TEAM_SLUG_PATTERN } from "@/lib/validation/onboarding";

export function teamRegistrationPath(slug: string, isNew = false) {
  if (!TEAM_SLUG_PATTERN.test(slug)) {
    throw new Error("Slug público inválido.");
  }

  return `/t/${slug}/register${isNew ? "?novo=1" : ""}`;
}

export function buildTeamRegistrationShareText(
  teamName: string,
  registrationUrl: string,
) {
  return `Venha jogar com o ${teamName.trim()}! Entre com seu WhatsApp ou crie seu perfil: ${registrationUrl}`;
}

export function buildTeamRegistrationWhatsAppUrl(
  teamName: string,
  registrationUrl: string,
) {
  return `https://wa.me/?text=${encodeURIComponent(
    buildTeamRegistrationShareText(teamName, registrationUrl),
  )}`;
}
