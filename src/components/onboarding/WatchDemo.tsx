"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Play, X } from "lucide-react";

// A secondary action on the welcome screen. The video lives in a dialog and is only mounted (and so only
// downloaded) after the visitor asks for it, which keeps the first screen as light as it was before.
export function WatchDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="
          inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border border-border bg-surface-1 px-5 py-2.5
          font-label text-sm font-semibold text-text-primary
          transition-all duration-150 ease-out hover:bg-surface-2 hover:scale-[1.02] active:scale-[0.98]
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
        "
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-mascot-body text-cta-foreground">
          <Play size={12} className="ml-0.5 fill-current" aria-hidden="true" />
        </span>
        Watch how it works
        <span className="font-normal text-text-muted">33s</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[60] w-[min(92vw,960px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-2xl outline-none">
          <Dialog.Title className="sr-only">Whittle in 33 seconds</Dialog.Title>
          <Dialog.Description className="sr-only">
            A short video: pick one hobby, answer four questions, get a personalised roadmap and learn it step by step with Ember.
          </Dialog.Description>
          <div className="aspect-video bg-black">
            <video className="size-full" controls autoPlay playsInline poster="/media/whittle-ad-poster.webp">
              <source src="/media/whittle-ad-av1.mp4" type='video/mp4; codecs="av01.0.05M.08"' />
              <source src="/media/whittle-ad-h264.mp4" type="video/mp4" />
            </video>
          </div>
          <Dialog.Close
            aria-label="Close video"
            className="absolute right-3 top-3 flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <X size={18} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
