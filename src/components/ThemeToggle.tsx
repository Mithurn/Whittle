"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// Fixed top-right at every breakpoint — the one corner that's empty
// regardless of page (onboarding hero, roadmap rail on the left, technique
// modal right-anchored but not full-bleed). z-30 sits above ordinary page
// content but below TechniqueModal's z-[100] backdrop, so it's naturally
// covered while a modal's open, same as any other background content —
// not a special exception the way the rail mascot is.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // next-themes can't report the real resolved theme until it runs
    // client-side — rendering before that risks a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Reserve the exact footprint so nothing shifts once it mounts.
    return <div className="fixed top-4 right-4 z-50 size-11 md:top-6 md:right-6" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed top-4 right-4 z-50 flex size-11 items-center justify-center rounded-full border border-border bg-surface-1 text-text-primary shadow-sm transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body md:top-6 md:right-6"
    >
      <Sun
        size={18}
        aria-hidden="true"
        className={`absolute transition-all duration-300 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        size={18}
        aria-hidden="true"
        className={`absolute transition-all duration-300 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
