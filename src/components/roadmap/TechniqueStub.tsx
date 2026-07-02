"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";

interface TechniqueStubProps {
  techniqueName: string | null;
  isMobile: boolean;
  onClose: () => void;
}

// Stub only — proves the node-click -> overlay wiring end to end. Real
// content (rationale, resources, notes, mastered/skip actions) is separate,
// not-yet-built work. Uses @base-ui/react's Dialog/Drawer, already a
// dependency — no new package needed for either the modal or the sheet.
export function TechniqueStub({ techniqueName, isMobile, onClose }: TechniqueStubProps) {
  const open = techniqueName !== null;
  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-[100] bg-black/60" />
          <Drawer.Viewport className="fixed inset-x-0 bottom-0 z-[100]">
            <Drawer.Popup className="rounded-t-2xl border-t border-border bg-surface-1 p-6 outline-none">
              <Drawer.Title className="font-heading text-xl font-bold text-text-primary">
                {techniqueName}
              </Drawer.Title>
              <Drawer.Description className="mt-2 font-sans text-sm text-text-muted">
                Full technique details are coming soon.
              </Drawer.Description>
              <Drawer.Close className="mt-6 w-full rounded-full bg-surface-2 py-3 font-label text-sm text-text-primary">
                Close
              </Drawer.Close>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/60" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[100] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface-1 p-6 outline-none">
          <Dialog.Title className="font-heading text-xl font-bold text-text-primary">
            {techniqueName}
          </Dialog.Title>
          <Dialog.Description className="mt-2 font-sans text-sm text-text-muted">
            Full technique details are coming soon.
          </Dialog.Description>
          <Dialog.Close className="mt-6 w-full rounded-full bg-surface-2 py-3 font-label text-sm text-text-primary">
            Close
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
