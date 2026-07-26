import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DeuTime — deu time, deu jogo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d2b22",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradiente decorativo */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(189,246,60,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Escudo / ícone */}
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 80,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* Escudo SVG simplificado */}
          <svg width="56" height="64" viewBox="0 0 100 110" fill="none">
            <path
              d="M10,8 H90 V50 C90,66 82,78 68,86 L50,95 L32,86 C18,78 10,66 10,50 Z"
              fill="#BDF63C"
            />
            <path
              d="M16,14 H84 V50 C84,62.5 77.5,72 65.5,78.5 L50,86.5 L34.5,78.5 C22.5,72 16,62.5 16,50 Z"
              fill="none"
              stroke="#0D2B22"
              strokeWidth="3"
            />
            <polyline
              points="32,50 45,63 69,35"
              fill="none"
              stroke="#0D2B22"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#f2efe6",
              letterSpacing: "-0.5px",
            }}
          >
            DeuTime
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: 760,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#f2efe6",
              lineHeight: 1.05,
              letterSpacing: "-2px",
            }}
          >
            Cansou de perguntar
            <br />
            <span style={{ color: "#bdf63c" }}>&ldquo;quem vai?&rdquo;</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(242,239,230,0.70)",
              lineHeight: 1.4,
              maxWidth: 680,
            }}
          >
            Convoca, cobra, fecha o número e divide os times.
            <br />
            Você só marca o jogo — e joga.
          </div>
        </div>

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: 80,
            background: "#bdf63c",
            borderRadius: 999,
            padding: "14px 32px",
            fontSize: 24,
            fontWeight: 700,
            color: "#0d2b22",
          }}
        >
          deutime.app
        </div>
      </div>
    ),
    { ...size }
  );
}
