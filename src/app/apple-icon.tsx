import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS "Add to Home Screen" icon — same chakra mark as icon.tsx, scaled up and
// filled edge-to-edge since Apple applies its own corner-rounding mask.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F1EA",
        }}
      >
        <svg
          width={140}
          height={140}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
      </div>
    ),
    { ...size },
  );
}
