import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const THERAPIES = [
  "Vamana",
  "Virechana",
  "Basti",
  "Nasya",
  "Raktamokshana",
  "Abhyanga",
];

// The card shown when a link to the deployed app is shared on LinkedIn,
// Slack, or X. Built from the same tokens as the landing page rather than a
// static export, so it never drifts out of sync with the real brand.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#F4F1EA",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(47,93,78,0.14) 1.5px, transparent 0)",
          backgroundSize: "34px 34px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg
            width={64}
            height={64}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="#F4F1EA"
              stroke="#2F5D4E"
              strokeWidth="2"
            />
            <path
              d="M6 24c5-11 6.5 11 13.5 11S29 12 36 24"
              stroke="#2F5D4E"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="24" cy="24" r="4.5" fill="#D99A3E" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#20342C",
                letterSpacing: "-0.01em",
              }}
            >
              Chikitsa Chakra
            </span>
            <span
              style={{
                fontSize: 17,
                color: "#5B6A63",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
              }}
            >
              Panchakarma Care Platform
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#20342C",
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            Panchakarma care, run properly.
          </span>
          <span style={{ fontSize: 24, color: "#4B5951", maxWidth: 880 }}>
            Constitution assessment, phase-aware scheduling, and outcome
            tracking for Ayurvedic clinics.
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {THERAPIES.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 18,
                color: "#4B5951",
                background: "#FFFFFF",
                border: "1px solid #DCD5C6",
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
