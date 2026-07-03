"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";

export type MascotState = "welcome" | "idle" | "thinking" | "success" | "error" | "explaining";

const ANIMATION_FILES: Record<MascotState, string> = {
  welcome: "/mascot/hello-maskot.json",
  idle: "/mascot/idle.json",
  // "thinking" stays mapped to the generic wait animation — still used by
  // GenerationLoadingScreen.tsx while the AI plan is generating. "explaining"
  // is the distinct, purpose-built state for "a technique is open" (see
  // MascotCompanion.tsx), not a replacement for this one.
  thinking: "/mascot/thinking.json",
  success: "/mascot/success.json",
  error: "/mascot/error.json",
  explaining: "/mascot/node-explaining.json",
};

interface MascotProps {
  state?: MascotState;
  size?: number;
  className?: string;
  /** Plays once and calls onComplete instead of looping forever — used for
   * the one-shot mastered-celebration playback (see MascotCompanion.tsx).
   * Defaults to true so every existing caller keeps looping unchanged. */
  loop?: boolean;
  onComplete?: () => void;
}

export function Mascot({
  state = "idle",
  size = 200,
  className = "",
  loop = true,
  onComplete,
}: MascotProps) {
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
        loop={loop}
        autoplay
        onComplete={onComplete}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
