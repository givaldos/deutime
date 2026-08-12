import { getPublicEvent } from "@/lib/data/public-event";
import { getPublicEventShareStateWithFallback } from "@/lib/data/public-event-share";
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
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noimageindex",
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

  const [event, teamLogoUrl, shareState] = await Promise.all([
    isValid ? getPublicEvent(publicId).catch(() => null) : Promise.resolve(null),
    isValid ? getTeamLogoPngDataUrlByEventPublicId(publicId) : Promise.resolve(null),
    isValid
      ? getPublicEventShareStateWithFallback(publicId)
      : Promise.resolve(null),
  ]);
  const lineup = shareState
    ? null
    : isValid
      ? await getPublicEventLineup(publicId).catch(() => {
          console.error("event_lineup_image.failed", {
            reason: "projection_unavailable",
          });
          return null;
        })
      : null;

  if (shareState) {
    console.info("event_share_image.rendered", {
      phase: shareState.phase,
      fallback: false,
    });
  }

  if (lineup) {
    console.info("event_lineup_image.rendered", {
      revision: lineup.revision,
      squadCount: lineup.squads.length,
      namedAthleteCount: lineup.squads.reduce(
        (count, squad) => count + squad.athletes.length,
        0,
      ),
    });
  }

  const brandLogoUrl = new URL(
    "/brand/logo-deutime-email-640-fundo-escuro.png",
    request.url,
  ).toString();

  return new ImageResponse(
    <InviteImage
      event={event}
      lineup={lineup}
      shareState={shareState}
      brandLogoUrl={brandLogoUrl}
      teamLogoUrl={teamLogoUrl}
    />,
    {
      width: 1200,
      height: 630,
      headers: !shareState && lineup ? privateLineupImageHeaders : imageHeaders,
    },
  );
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: imageHeaders });
}
