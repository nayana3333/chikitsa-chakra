import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans-var",
  subsets: ["latin"],
  display: "swap",
});

// A humanist serif for headings — gives the clinical UI some warmth without
// resorting to the decorative "Sanskrit-style" display faces that make
// Ayurveda products look like tourist brochures.
const serif = Fraunces({
  variable: "--font-serif-var",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: {
    default: "Chikitsa Chakra — Panchakarma Care Platform",
    template: "%s · Chikitsa Chakra",
  },
  description:
    "Panchakarma patient management and therapy scheduling: constitution assessment, multi-phase protocol planning, resource-aware scheduling, and outcome tracking for Ayurvedic clinics.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Applies the stored theme before first paint. Without this the page
          renders light, then flips to dark once React hydrates — a visible
          flash on every load for dark-mode users.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('chikitsa-theme');
                var d = t ? t === 'dark'
                          : window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (d) document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-card !text-card-foreground !border !border-border !rounded-lg",
            },
          }}
        />
      </body>
    </html>
  );
}
