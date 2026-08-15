"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The mark: a chakra ring with the pulse-wave from the original Chikitsa
 * Chakra prototype running through it — the wheel of treatment carrying a
 * vital sign.
 */
export function Logo({
  className,
  showWordmark = true,
  size = 36,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <circle
          cx="24"
          cy="24"
          r="21"
          className="stroke-primary"
          strokeWidth="2.5"
          opacity="0.25"
        />
        {/* Eight spokes — the chakra */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1="24"
            y1="24"
            x2={24 + 21 * Math.cos((i * Math.PI) / 4)}
            y2={24 + 21 * Math.sin((i * Math.PI) / 4)}
            className="stroke-primary"
            strokeWidth="1.25"
            opacity="0.2"
          />
        ))}
        <path
          d="M6 24c5-11 6.5 11 13.5 11S29 12 36 24"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="24" cy="24" r="3.5" className="fill-accent" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-[15px] font-semibold tracking-tight text-foreground">
            Chikitsa Chakra
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Panchakarma Care
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * The `dark` class on <html> is the source of truth — it's set by the inline
 * script in the root layout before React hydrates. Reading it with
 * useSyncExternalStore rather than an effect avoids a cascading render on
 * mount, and keeps the icon correct if the class is changed from anywhere else.
 */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const readTheme = () => document.documentElement.classList.contains("dark");

// The server can't know the user's theme, so it renders the light-mode icon;
// the inline script has already applied the class by the time this hydrates.
const readThemeOnServer = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = React.useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    readThemeOnServer,
  );

  function toggle() {
    const next = !isDark;
    // Mutating the class notifies the subscription above, which re-renders.
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("chikitsa-theme", next ? "dark" : "light");
    } catch {
      // Private browsing with storage disabled — the toggle still works for
      // this page view, it just won't be remembered.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
