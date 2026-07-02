"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";

export type MascotState = "welcome" | "idle" | "thinking" | "success" | "error";

const ANIMATION_FILES: Record<MascotState, string> = {
  welcome: "/mascot/hello-maskot.json",
  idle: "/mascot/idle.json",
  thinking: "/mascot/thinking.json",
  success: "/mascot/success.json",
  error: "/mascot/error.json",
};

interface MascotProps {
  state?: MascotState;
  size?: number;
  className?: string;
}

export function Mascot({ state = "idle", size = 200, className = "" }: MascotProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(ANIMATION_FILES[state]);
        const data = await res.json();
        if (!cancelled) setAnimationData(data);
      } catch {
        // Silently fail — the mascot is decorative, not critical
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [state]);

  if (!animationData) {
    // Reserve space so layout doesn't jump
    return <div style={{ width: size, height: size }} className={className} />;
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        animationData={animationData}
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
