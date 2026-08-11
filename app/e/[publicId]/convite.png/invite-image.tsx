/* eslint-disable @next/next/no-img-element -- next/og renderiza o ativo oficial por meio de img. */
import type { PublicEvent } from "@/lib/data/public-event";
import type { PublicEventLineup } from "@/lib/data/public-lineup";
import {
  formatPublicEventTime,
  publicEventKindLabels,
  publicEventStatusPresentation,
} from "@/lib/features/public-event/presentation";

export function InviteImage({
  event,
  lineup = null,
  brandLogoUrl = "/brand/logo-deutime-email-640-fundo-escuro.png",
  teamLogoUrl = null,
}: {
  event: PublicEvent | null;
  lineup?: PublicEventLineup | null;
  brandLogoUrl?: string;
  teamLogoUrl?: string | null;
}) {
  if (event && lineup) {
    return (
      <PublishedLineupImage
        event={event}
        lineup={lineup}
        brandLogoUrl={brandLogoUrl}
        teamLogoUrl={teamLogoUrl}
      />
    );
  }
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

function PublishedLineupImage({
  event,
  lineup,
  brandLogoUrl,
  teamLogoUrl,
}: {
  event: PublicEvent;
  lineup: PublicEventLineup;
  brandLogoUrl: string;
  teamLogoUrl: string | null;
}) {
  const columns = lineup.squads.length <= 2 ? 2 : lineup.squads.length <= 6 ? 3 : 4;
  const rows = Math.ceil(lineup.squads.length / columns);
  const athleteLimit = rows === 1 ? 10 : rows === 2 ? 5 : 3;
  const cardWidth = `${Math.floor(96 / columns)}%`;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0d2b22", color: "#f7f5ed", fontFamily: "sans-serif", padding: "38px 54px 34px 66px", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 12, height: "100%", background: "#bdf63c", display: "flex" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {teamLogoUrl ? <img src={teamLogoUrl} alt="" style={{ width: 58, height: 58, borderRadius: 16, objectFit: "cover" }} /> : <div style={{ width: 58, height: 58, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(189,246,60,.12)", border: "2px solid rgba(189,246,60,.3)", color: "#bdf63c", fontSize: 26, fontWeight: 900 }}>{event.team_name.charAt(0).toUpperCase()}</div>}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#bdf63c", fontSize: 15, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Times definidos</span>
            <span style={{ fontSize: 28, fontWeight: 900 }}>{event.title}</span>
            <span style={{ color: "#a9c6b8", fontSize: 15 }}>{event.team_name} · revisão {lineup.revision}</span>
          </div>
        </div>
        <img src={brandLogoUrl} alt="DeuTime" style={{ width: 190, height: 46, objectFit: "contain", objectPosition: "right center", opacity: .8 }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignContent: "stretch", justifyContent: "space-between", gap: 10, flex: 1, marginTop: 24 }}>
        {lineup.squads.map((squad) => {
          const visible = squad.athletes.slice(0, athleteLimit);
          const remaining = squad.athletes.length - visible.length;
          return (
            <div key={`${squad.sort_order}:${squad.name}`} style={{ width: cardWidth, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,.07)", borderTop: `7px solid ${squad.color ?? "#0D9488"}`, padding: "12px 16px" }}>
              <span style={{ fontSize: rows >= 3 ? 18 : 23, fontWeight: 900, color: "#bdf63c" }}>{squad.name}</span>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 6, gap: 2 }}>
                {visible.length > 0 ? visible.map((athlete) => <span key={`${athlete.sort_order}:${athlete.name}`} style={{ fontSize: rows >= 3 ? 13 : 17, color: "#f7f5ed", fontWeight: 700 }}>{athlete.name}</span>) : <span style={{ fontSize: 13, color: "#a9c6b8" }}>Sem nomes autorizados</span>}
                {remaining > 0 ? <span style={{ fontSize: 12, color: "#a9c6b8", fontWeight: 700 }}>+{remaining} autorizados</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <span style={{ marginTop: 14, fontSize: 13, color: "#a9c6b8" }}>Somente nomes esportivos com autorização vigente · deutime.app</span>
    </div>
  );
}
