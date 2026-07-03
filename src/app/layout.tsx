import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, Sora } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Whittle — Learn any hobby, step by step",
  description:
    "Whittle generates a personalised, AI-powered learning plan for any hobby. Pick a goal, and we'll map the path.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${manrope.variable} ${sora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
