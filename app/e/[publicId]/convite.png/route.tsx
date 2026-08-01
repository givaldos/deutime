/* eslint-disable @next/next/no-img-element -- next/og renderiza o ativo oficial por meio de img. */
import { getPublicEvent, type PublicEvent } from "@/lib/data/public-event";
import {
  formatPublicEventDate,
  formatPublicEventTime,
  isPublicEventId,
  publicEventKindLabels,
  publicEventStatusPresentation,
} from "@/lib/features/public-event/presentation";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const imageHeaders = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  "Content-Type": "image/png",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, noimageindex",
};

type InviteImageRouteContext = {
  params: Promise<{ publicId: string }>;
};

export async function GET(
  request: Request,
  context: InviteImageRouteContext,
) {
  const { publicId } = await context.params;
  const event = isPublicEventId(publicId)
    ? await getPublicEvent(publicId).catch(() => null)
    : null;
  const brandLogoUrl = new URL(
    "/brand/logo-deutime-email-640-fundo-escuro.png",
    request.url,
  ).toString();

  return new ImageResponse(
    <InviteImage event={event} brandLogoUrl={brandLogoUrl} />,
    {
      width: 1200,
      height: 630,
      headers: imageHeaders,
    },
  );
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: imageHeaders });
}

export function InviteImage({
  event,
  brandLogoUrl = "/brand/logo-deutime-email-640-fundo-escuro.png",
}: {
  event: PublicEvent | null;
  brandLogoUrl?: string;
}) {
  const status = event
    ? publicEventStatusPresentation[event.status]
    : publicEventStatusPresentation.scheduled;
  const date = event
    ? formatPublicEventDate(event.starts_at, event.team_timezone)
    : "Confira os detalhes do convite";
  const time = event
    ? formatPublicEventTime(event.starts_at, event.team_timezone)
    : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "58px 68px",
        background: "#0d2b22",
        color: "#f7f5ed",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <img
          src={brandLogoUrl}
          alt="DeuTime"
          style={{
            width: 360,
            height: 87,
            objectFit: "contain",
            objectPosition: "left center",
          }}
        />
        <span style={{ fontSize: 18, color: "#a9c6b8" }}>
          Convocação do time
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 1040,
        }}
      >
        <span
          style={{
            color: "#bdf63c",
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {event ? event.team_name : "Convite para o evento"}
        </span>
        <span
          style={{
            fontSize: event && event.title.length > 55 ? 54 : 68,
            lineHeight: 1.02,
            fontWeight: 900,
            letterSpacing: -2,
          }}
        >
          {event?.title ?? "Você foi convocado"}
        </span>
        <span style={{ fontSize: 28, color: "#d7e3dc" }}>
          {event ? `${date}, às ${time}` : date}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 21, color: "#a9c6b8" }}>
          {event ? publicEventKindLabels[event.kind] : "deutime.app"}
        </span>
        <span
          style={{
            borderRadius: 999,
            padding: "12px 24px",
            background: "rgba(189, 246, 60, 0.12)",
            border: "2px solid rgba(189, 246, 60, 0.45)",
            color: "#bdf63c",
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          {status.label}
        </span>
      </div>
    </div>
  );
}
