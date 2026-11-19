"use client";

import { useState } from "react";
import { EmberGif } from "./EmberGif";
import { DEMO_HOBBY, DEMO_MASTERED_COUNT, ROADMAP_STEPS } from "./landing-config";
import styles from "./landing.module.css";

const stepsAway = (n: number) => (n === 1 ? "1 step" : `${n} steps`);

function reaction(nowMastered: boolean, left: number) {
  if (!nowMastered) return "Back on the list. No rush.";
  if (left === 0) return "All mastered. Go play a real game!";
  return `Nice, that's one more in the bag. ${stepsAway(left)} to go.`;
}

export function EmberDemo() {
  const [mastered, setMastered] = useState(() => ROADMAP_STEPS.map((_, i) => i < DEMO_MASTERED_COUNT));
  const [message, setMessage] = useState<string | null>(null);
  const left = mastered.filter((m) => !m).length;
  const bubble = message ?? `You're ${left} steps away from mastering ${DEMO_HOBBY}!`;

  const toggle = (index: number) => {
    const next = mastered.map((m, i) => (i === index ? !m : m));
    setMastered(next);
    setMessage(reaction(next[index], next.filter((m) => !m).length));
  };

  return (
    <>
      <div className={styles.demoTop}>
        <EmberGif width={96} alt="Ember the mascot" />
        <p className={styles.bubble} aria-live="polite">
          <span key={bubble} className={styles.popText}>
            {bubble}
          </span>
        </p>
      </div>
      <ul className={styles.demoList}>
        {ROADMAP_STEPS.map((step, i) => (
          <li key={step} className={mastered[i] ? styles.mastered : ""}>
            <span>{step}</span>
            <button type="button" aria-pressed={mastered[i]} onClick={() => toggle(i)}>
              {mastered[i] ? "Mastered" : "Mark mastered"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
