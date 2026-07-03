"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ComponentProps } from "react";

// Thin wrapper so layout.tsx doesn't import next-themes directly — keeps the
// provider's config (attribute/defaultTheme) in one place. defaultTheme is
// "light", not "system": light is the promised default regardless of the
// visitor's OS setting, not a preference to detect.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemeProvider>) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="light" {...props}>
      {children}
    </NextThemeProvider>
  );
}
