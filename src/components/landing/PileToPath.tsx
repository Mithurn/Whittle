"use client";

import { useRef, useState, type CSSProperties } from "react";
import { EmberGif } from "./EmberGif";
import {
  DONE_THRESHOLD,
  PILE_CHIPS,
  SLIDER_DONE_THRESHOLD,
  STAGE_BUBBLE_LINES,
  TRAIL_PATH,
} from "./landing-config";
import { useWhittleProgress } from "./use-whittle-progress";
import styles from "./landing.module.css";

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

const bubbleLine = (p: number) =>
  STAGE_BUBBLE_LINES.reduce((line, [at, text]) => (p >= at ? text : line), STAGE_BUBBLE_LINES[0][1]);

export function PileToPath() {
  const stageRef = useRef<HTMLDivElement>(null);
  const { progress, scrub, animateTo } = useWhittleProgress(stageRef);
  const [pilingUp, setPilingUp] = useState(false);
  const line = bubbleLine(progress);

  const toggle = () => {
    const goToPath = progress < SLIDER_DONE_THRESHOLD;
    animateTo(goToPath ? 1 : 0);
    setPilingUp(goToPath);
  };

  return (
    <div className={styles.stageWrap}>
      <div
        ref={stageRef}
        className={styles.stage}
        data-done={progress > DONE_THRESHOLD ? 1 : 0}
        style={{ "--p": progress } as CssVars}
        role="img"
        aria-label="Animation: a scattered pile of video and article tabs shrinks into five steps on a single path"
      >
        <span className={`${styles.stageLabel} ${styles.stageLabelL}`}>The firehose</span>
        <span className={`${styles.stageLabel} ${styles.stageLabelR}`}>Your roadmap</span>
        <svg className={styles.trail} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={TRAIL_PATH} />
        </svg>
        {PILE_CHIPS.map((chip, i) => {
          const vars: CssVars = { "--x0": chip.x, "--y0": chip.y, "--r": ((i * 37) % 30) - 15 };
          if (chip.end) {
            vars["--x1"] = chip.end[0];
            vars["--y1"] = chip.end[1];
          }
          return (
            <div key={chip.label} className={`${styles.chip} ${chip.end ? styles.keep : ""}`} style={vars}>
              <b />
              <span>{chip.label}</span>
            </div>
          );
        })}
        <div className={styles.stageEmber}>
          <EmberGif width={74} />
          <p className={styles.bubble} aria-live="polite">
            <span key={line} className={styles.popText}>
              {line}
            </span>
          </p>
        </div>
      </div>
      <div className={styles.stageCtl}>
        <label className={styles.slider}>
          Pile
          <input
            type="range"
            min={0}
            max={100}
            value={progress * 100}
            onChange={(e) => scrub(Number(e.target.value) / 100)}
            aria-label="Whittle the pile into a roadmap"
          />
          Path
        </label>
        <button className={`${styles.btn} ${styles.small}`} type="button" onClick={toggle}>
          {pilingUp ? "Pile it back up" : "Whittle it"}
        </button>
      </div>
    </div>
  );
}
