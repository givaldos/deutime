import { ImageResponse } from "next/og";

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
          justifyContent: "space-between",
          padding: "64px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Topo: logotipo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Escudo */}
          <svg width="48" height="56" viewBox="0 0 100 110" fill="none">
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
              fontSize: 30,
              fontWeight: 700,
              color: "#f2efe6",
              letterSpacing: "-0.5px",
            }}
          >
            DeuTime
          </span>
        </div>

        {/* Centro: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#f2efe6",
              lineHeight: 1.05,
              letterSpacing: "-2.5px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span>Cansou de perguntar</span>
            <span style={{ color: "#bdf63c" }}>{'"quem vai?"'}</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#a8b8a4",
              lineHeight: 1.45,
              maxWidth: 700,
              display: "flex",
            }}
          >
            Convoca, cobra, fecha o numero e divide os times. Voce so marca o jogo — e joga.
          </div>
        </div>

        {/* Rodapé: badge */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: "#bdf63c",
              borderRadius: 999,
              padding: "12px 28px",
              fontSize: 22,
              fontWeight: 700,
              color: "#0d2b22",
              display: "flex",
            }}
          >
            deutime.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
