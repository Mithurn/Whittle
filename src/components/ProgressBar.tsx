"use client";

import type { CSSProperties } from "react";
import { ProgressBar as AriaProgressBar, type ProgressBarProps as AriaProgressBarProps } from "react-aria-components";
import "./ProgressBar.css";

export interface ProgressBarProps extends AriaProgressBarProps {
  label?: string;
}

// CSSProperties has no index signature for custom properties — this is a
// precise, narrow type for the one custom property .fill actually reads,
// not `any`.
type FillStyle = CSSProperties & { "--percent": string };

// Premium glossy 3D progress bar. `label` carries the real "X/Y mastered"
// text (see MascotCompanion.tsx: `${mastered}/${total} mastered`) and
// react-aria's auto-generated valueText carries the percentage — together
// reconstructing the old "X/Y mastered · Z%" line across the component's
// two built-in slots, both driven by real getProgress() data, never a
// placeholder.
export function ProgressBar({ label, ...props }: ProgressBarProps) {
  return (
    <AriaProgressBar {...props}>
      {({ percentage, valueText, isIndeterminate }) => (
        <>
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-semibold text-text-primary">{label}</span>
            <span className="text-xs font-medium text-text-muted">{valueText}</span>
          </div>
          <div className="track inset">
            <div
              className="fill"
              style={{ "--percent": `${isIndeterminate ? 100 : percentage}%` } as FillStyle}
            />
          </div>
        </>
      )}
    </AriaProgressBar>
  );
}
