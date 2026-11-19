"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { LESSON_SLIDES, LESSON_TECHNIQUE } from "./landing-config";
import styles from "./landing.module.css";

const ARROW_STEP: Record<string, number> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};
const total = LESSON_SLIDES.length;

export function LessonTabs() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const slide = LESSON_SLIDES[active];

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const step = ARROW_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (index + step + total) % total;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={`${styles.wrap} ${styles.lessonGrid}`}>
      <div>
        <p className={styles.eyebrow}>Inside a technique</p>
        <h2 id="lesson-heading">Five slides. One skill. Done in a sitting.</h2>
        <p className={styles.lede}>
          Every technique follows the same shape, so you always know where you
          are. Try it.
        </p>
        <div className={styles.tabs} role="tablist" aria-label="Lesson slides">
          {LESSON_SLIDES.map((s, i) => (
            <button
              key={s.name}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`lesson-tab-${i}`}
              aria-selected={i === active}
              aria-controls="lesson-card"
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className={styles.k}>{i + 1}</span>
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <div
        className={styles.card}
        id="lesson-card"
        role="tabpanel"
        aria-labelledby={`lesson-tab-${active}`}
        aria-live="polite"
      >
        <div key={active} className={styles.slide}>
          <div className={styles.pips} aria-hidden="true">
            {LESSON_SLIDES.map((s, i) => (
              <i key={s.name} className={i <= active ? styles.on : ""} />
            ))}
          </div>
          <div className={styles.meta}>
            <span>
              Slide {active + 1} of {total}
            </span>
            <span>{LESSON_TECHNIQUE}</span>
          </div>
          <h3>{slide.name}</h3>
          <p>
            <strong>{slide.title}.</strong> {slide.desc}
          </p>
          {slide.video ? (
            <div className={`${styles.panel} ${styles.video}`}>
              <span className={styles.play} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M6 3.5v13l11-6.5z" fill="#180F05" />
                </svg>
              </span>
              <div>
                <strong>{slide.video.label}</strong>
                <span className={styles.src}>{slide.video.why}</span>
              </div>
            </div>
          ) : (
            <div className={styles.panel}>
              <ul>
                {slide.items?.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
