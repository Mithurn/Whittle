"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { MascotWithSpeech } from "@/components/MascotWithSpeech";
import { ProgressBar } from "./ProgressBar";
import { KNOWN_TOPIC_MAX, KNOWN_TOPICS_MAX_COUNT } from "@/lib/schemas";

interface KnownTopicsScreenProps {
  initialValue: string[];
  onNext: (topics: string[]) => void;
  onBack: () => void;
}

// The only onboarding field that's genuinely optional — Continue is never
// disabled here (unlike every other step), and the mascot copy says so
// directly rather than relying on that alone to communicate it.
export function KnownTopicsScreen({ initialValue, onNext, onBack }: KnownTopicsScreenProps) {
  const [topics, setTopics] = useState<string[]>(initialValue);
  const [inputValue, setInputValue] = useState("");
  const atCap = topics.length >= KNOWN_TOPICS_MAX_COUNT;

  function commitTopic(raw: string) {
    const trimmed = raw.trim().slice(0, KNOWN_TOPIC_MAX);
    if (!trimmed || atCap) return;
    // Case-insensitive dedupe — "Castling" and "castling" would otherwise
    // sit side by side as two near-identical chips.
    if (topics.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }
    setTopics((t) => [...t, trimmed]);
    setInputValue("");
  }

  function removeTopic(topic: string) {
    setTopics((t) => t.filter((existing) => existing !== topic));
  }

  // Anything still sitting in the text field when Continue is pressed gets
  // committed too — a chip input that silently drops typed-but-unsubmitted
  // text on submit is a common, easy-to-miss papercut.
  function handleContinue() {
    const trimmed = inputValue.trim().slice(0, KNOWN_TOPIC_MAX);
    const alreadyPresent = topics.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    const final = trimmed && !atCap && !alreadyPresent ? [...topics, trimmed] : topics;
    onNext(final);
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background w-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 pt-8 pb-4 px-5 w-full max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary p-2 -ml-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body rounded-full flex-shrink-0"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <ProgressBar currentStep={5} />

        <div className="w-10 flex-shrink-0" />
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 items-center justify-center px-5 pt-20 sm:pt-0 w-full max-w-sm sm:max-w-2xl mx-auto">
        <MascotWithSpeech
          state="idle"
          message="Already know a few things? Add them here, or skip ahead."
          size="md"
          position="inline"
          stackOnMobile
        />

        <div className="w-full max-w-sm mx-auto mt-14">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={atCap ? `You've added the max (${KNOWN_TOPICS_MAX_COUNT})` : "e.g. castling"}
              maxLength={KNOWN_TOPIC_MAX}
              disabled={atCap}
              aria-label="Add a topic you already know"
              className="
                w-full bg-surface-2 border-2 border-border
                focus:border-mascot-body focus:ring-0 focus:outline-none
                rounded-xl pl-5 pr-14 py-4 text-text-primary text-lg
                transition-all placeholder:text-text-muted
                disabled:opacity-60
              "
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitTopic(inputValue);
                }
              }}
            />
            {/* Enter/comma also commits — this button exists because that's
                not discoverable on its own, especially on mobile where
                there's no visible hint a return key does anything special. */}
            <button
              type="button"
              onClick={() => commitTopic(inputValue)}
              disabled={atCap || !inputValue.trim()}
              aria-label="Add topic"
              className="
                absolute right-2 top-1/2 -translate-y-1/2
                flex size-11 items-center justify-center rounded-full
                text-text-muted hover:text-text-primary hover:bg-surface-1
                disabled:opacity-40 disabled:pointer-events-none
                transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
              "
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          </div>

          {!atCap && (
            <p className="mt-2 px-1 font-sans text-xs text-text-muted">Press Enter or tap + to add each one.</p>
          )}

          {topics.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Topics you already know">
              {topics.map((topic) => (
                <li
                  key={topic}
                  className="flex items-center gap-1.5 rounded-full bg-surface-2 border border-border pl-3 pr-2 py-1.5"
                >
                  <span className="font-sans text-sm text-text-primary">{topic}</span>
                  <button
                    type="button"
                    onClick={() => removeTopic(topic)}
                    aria-label={`Remove ${topic}`}
                    className="text-text-muted hover:text-text-primary rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Footer / CTA ── */}
      <div className="px-5 pb-8 pt-4 max-w-sm w-full mx-auto self-center">
        <button
          onClick={handleContinue}
          className="
            w-full py-4 rounded-[18px]
            bg-gradient-to-r from-cta-start via-cta-mid to-cta-end
            font-label text-base font-semibold tracking-wide text-cta-foreground
            shadow-[0_0_12px_rgba(198,105,0,0.3)]
            hover:shadow-[0_0_20px_rgba(198,105,0,0.5)]
            hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-150 ease-out
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
          "
        >
          Continue
        </button>
      </div>
    </div>
  );
}
