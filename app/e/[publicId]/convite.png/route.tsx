import { getPublicEvent } from "@/lib/data/public-event";
import { getPublicEventLineup } from "@/lib/data/public-lineup";
import { getTeamLogoPngDataUrlByEventPublicId } from "@/lib/data/team-logo";
import { isPublicEventId } from "@/lib/features/public-event/presentation";
import { ImageResponse } from "next/og";
import { InviteImage } from "./invite-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const imageHeaders = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  "Content-Type": "image/png",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, noimageindex",
};

const privateLineupImageHeaders = {
  ...imageHeaders,
  "Cache-Control": "private, no-store, max-age=0",
};

type InviteImageRouteContext = {
  params: Promise<{ publicId: string }>;
};

export async function GET(
  request: Request,
  context: InviteImageRouteContext,
) {
  const { publicId } = await context.params;
  const isValid = isPublicEventId(publicId);

  const [event, teamLogoUrl, lineup] = await Promise.all([
    isValid ? getPublicEvent(publicId).catch(() => null) : Promise.resolve(null),
    isValid ? getTeamLogoPngDataUrlByEventPublicId(publicId) : Promise.resolve(null),
    isValid ? getPublicEventLineup(publicId).catch(() => null) : Promise.resolve(null),
  ]);

  const brandLogoUrl = new URL(
    "/brand/logo-deutime-email-640-fundo-escuro.png",
    request.url,
  ).toString();

  return new ImageResponse(
    <InviteImage event={event} lineup={lineup} brandLogoUrl={brandLogoUrl} teamLogoUrl={teamLogoUrl} />,
    {
      width: 1200,
      height: 630,
      headers: lineup ? privateLineupImageHeaders : imageHeaders,
    },
  );
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: imageHeaders });
}
