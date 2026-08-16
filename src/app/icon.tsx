import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Generated at build time so the browser tab, bookmarks, and search results
// carry the same chakra mark as the in-app logo, instead of the framework's
// default icon.
export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width={32}
        height={32}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
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
        <circle cx="24" cy="24" r="4" fill="#D99A3E" />
      </svg>
    ),
    { ...size },
  );
}
