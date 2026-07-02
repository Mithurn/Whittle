"use client";

import { useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { HobbyInputScreen } from "./HobbyInputScreen";
import { SkillLevelScreen } from "./SkillLevelScreen";
import { GoalScreen } from "./GoalScreen";
import { TimeCommitmentScreen } from "./TimeCommitmentScreen";
import { GenerationLoadingScreen } from "./GenerationLoadingScreen";
import { GenerationErrorScreen } from "./GenerationErrorScreen";
import { GeneratePlanRequest } from "@/lib/schemas";
import { usePlanStore } from "@/store/plan-store";
import type { HobbyPlan } from "@/types/domain";

// Real grounded generation measured at 15-25s (see /docs/decisions.md) —
// this guards against a genuinely hung request, not the expected wait.
const GENERATION_TIMEOUT_MS = 45_000;

type Status = "idle" | "submitting" | "error";

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<GeneratePlanRequest>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [pendingRequest, setPendingRequest] = useState<GeneratePlanRequest | null>(null);
  const setPlan = usePlanStore((s) => s.setPlan);

  async function submitPlan(request: GeneratePlanRequest) {
    setPendingRequest(request);
    setStatus("submitting");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`generate-plan responded with ${res.status}`);

      const plan: HobbyPlan = await res.json();
      setPlan(plan);
      // Status intentionally stays "submitting" — page.tsx swaps away from
      // OnboardingFlow entirely once currentPlan is set in the store.
    } catch (err) {
      console.error("[onboarding] plan generation failed", err);
      setStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  }

  if (status === "submitting" && pendingRequest) {
    return <GenerationLoadingScreen request={pendingRequest} />;
  }

  if (status === "error") {
    return <GenerationErrorScreen onRetry={() => pendingRequest && submitPlan(pendingRequest)} />;
  }

  if (step === 0) {
    return <WelcomeScreen onStart={() => setStep(1)} />;
  }

  if (step === 1) {
    return (
      <HobbyInputScreen
        initialValue={data.hobbyName || ""}
        onNext={(hobbyName) => {
          setData((d) => ({ ...d, hobbyName }));
          setStep(2);
        }}
        onBack={() => setStep(0)}
      />
    );
  }

  if (step === 2) {
    return (
      <SkillLevelScreen
        initialValue={data.level}
        onNext={(level) => {
          setData((d) => ({ ...d, level }));
          setStep(3);
        }}
        onBack={() => setStep(1)}
      />
    );
  }

  if (step === 3) {
    return (
      <GoalScreen
        initialValue={data.goal || ""}
        hobbyName={data.hobbyName || ""}
        onNext={(goal) => {
          setData((d) => ({ ...d, goal }));
          setStep(4);
        }}
        onBack={() => setStep(2)}
      />
    );
  }

  return (
    <TimeCommitmentScreen
      initialValue={data.timeCommitment || ""}
      onNext={(timeCommitment) => {
        // Safe: every prior step only calls its onNext once its own field is
        // valid, so by the time this last step completes, data always has
        // every required field except this one — this is the one legitimate
        // Partial -> complete spot. Known topics are no longer collected in
        // onboarding, so they're always sent empty (the schema defaults it).
        const request = { ...data, timeCommitment, knownTopics: [] } as GeneratePlanRequest;
        setData(request);
        submitPlan(request);
      }}
      onBack={() => setStep(3)}
    />
  );
}
