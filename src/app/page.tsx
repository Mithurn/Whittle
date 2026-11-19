import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Whittle: one hobby, one roadmap",
  description:
    "Pick one hobby and get a personalized roadmap of 5 to 8 techniques, each taught in 5 short slides. No accounts, no streaks.",
};

export default function Home() {
  return <LandingPage />;
}
