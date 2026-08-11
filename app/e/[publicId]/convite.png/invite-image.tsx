/* eslint-disable @next/next/no-img-element -- next/og renderiza o ativo oficial por meio de img. */
import type { PublicEvent } from "@/lib/data/public-event";
import {
  formatPublicEventTime,
  publicEventKindLabels,
  publicEventStatusPresentation,
} from "@/lib/features/public-event/presentation";

export function InviteImage({
  event,
  brandLogoUrl = "/brand/logo-deutime-email-640-fundo-escuro.png",
  teamLogoUrl = null,
}: {
  event: PublicEvent | null;
  brandLogoUrl?: string;
  teamLogoUrl?: string | null;
}) {
  const status = event
    ? publicEventStatusPresentation[event.status]
    : publicEventStatusPresentation.scheduled;
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
        background: "#0d2b22",
        color: "#f7f5ed",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Faixa lateral verde lima à esquerda */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 12,
          height: "100%",
          background: "#bdf63c",
          display: "flex",
        }}
      />

      {/* Conteúdo principal */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "52px 68px 52px 80px",
          gap: 0,
        }}
      >
        {/* Header: logo do time + nome do time + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {teamLogoUrl ? (
              <img
                src={teamLogoUrl}
                alt=""
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  objectFit: "cover",
                  background: "#1a3d2e",
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: "rgba(189, 246, 60, 0.12)",
                  border: "2px solid rgba(189, 246, 60, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#bdf63c",
                }}
              >
                {event ? event.team_name.charAt(0).toUpperCase() : "D"}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#a9c6b8",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Convocação
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#bdf63c",
                  letterSpacing: -0.5,
                }}
              >
                {event ? event.team_name : "DeuTime"}
              </span>
            </div>
          </div>

          <img
            src={brandLogoUrl}
            alt="DeuTime"
            style={{
              width: 220,
              height: 53,
              objectFit: "contain",
              objectPosition: "right center",
              opacity: 0.7,
            }}
          />
        </div>

        {/* Nome do evento — grande */}
        <span
          style={{
            fontSize: event && event.title.length > 35 ? 72 : 88,
            lineHeight: 0.96,
            fontWeight: 900,
            letterSpacing: -3,
            color: "#f7f5ed",
            maxWidth: 900,
            marginBottom: 36,
          }}
        >
          {event?.title ?? "Você foi convocado"}
        </span>

        {/* Bloco de data e hora — destaque máximo */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 0,
            borderRadius: 24,
            overflow: "hidden",
            width: "fit-content",
          }}
        >
          {/* Dia + mês */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#bdf63c",
              color: "#0d2b22",
              padding: "20px 28px",
              minWidth: 110,
              lineHeight: 1,
              gap: 4,
            }}
          >
            <span style={{ fontSize: 56, fontWeight: 900 }}>
              {event
                ? new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    timeZone: event.team_timezone,
                  }).format(new Date(event.starts_at))
                : "--"}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {event
                ? new Intl.DateTimeFormat("pt-BR", {
                    month: "short",
                    timeZone: event.team_timezone,
                  })
                    .format(new Date(event.starts_at))
                    .replace(".", "")
                : "---"}
            </span>
          </div>

          {/* Dia da semana + horário */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              background: "rgba(189, 246, 60, 0.12)",
              padding: "20px 32px",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: "#f7f5ed",
                textTransform: "capitalize",
              }}
            >
              {event
                ? new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                    timeZone: event.team_timezone,
                  }).format(new Date(event.starts_at))
                : "A confirmar"}
            </span>
            <span
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: "#bdf63c",
                letterSpacing: -1,
              }}
            >
              {event && time ? `às ${time}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 68px 20px 80px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ fontSize: 18, color: "#a9c6b8", fontWeight: 600 }}>
          {event ? publicEventKindLabels[event.kind] : "deutime.app"}
        </span>
        <span
          style={{
            borderRadius: 999,
            padding: "10px 22px",
            background: "rgba(189, 246, 60, 0.12)",
            border: "2px solid rgba(189, 246, 60, 0.35)",
            color: "#bdf63c",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {status.label}
        </span>
      </div>
    </div>
  );
}
