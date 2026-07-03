"use client";

import { Check, X } from "lucide-react";

interface ProsConsListProps {
  advantages: string[];
  disadvantages: string[];
}

export function ProsConsList({ advantages, disadvantages }: ProsConsListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-5 shadow-sm">
        <h3 className="font-heading text-lg font-semibold text-text-primary">Advantages</h3>
        <ul className="flex flex-col gap-3">
          {advantages.map((adv, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="font-sans text-sm text-text-muted">{adv}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-5 shadow-sm">
        <h3 className="font-heading text-lg font-semibold text-text-primary">Disadvantages</h3>
        <ul className="flex flex-col gap-3">
          {disadvantages.map((disadv, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                <X size={12} strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="font-sans text-sm text-text-muted">{disadv}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
