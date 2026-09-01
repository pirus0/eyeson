"use client";

import { CloseIcon } from "./Icons";
import { IconButton } from "./IconButton";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** SettingsSheet alone uses the "-alt" box variant; everything else uses
   * the default. */
  variant?: "box" | "box-alt";
  /** AddItemSheet opens taller (90vh) than the other three (85vh). */
  maxHeightClassName?: string;
  children: React.ReactNode;
};

/** Shared bottom-sheet/modal shell — backdrop, sized card, header with title
 * and close button — used by every overlay panel (add-item, reminders,
 * settings, unscheduled) so they can't silently drift from each other (as
 * they had: one panel alone sat at a different z-index than the rest). */
export function Sheet({
  open,
  onClose,
  title,
  variant = "box",
  maxHeightClassName = "max-h-[85vh]",
  children,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/20 sm:items-center">
      <div
        className={`${variant === "box-alt" ? "sketch-box-alt" : "sketch-box"} ${maxHeightClassName} w-full max-w-md overflow-y-auto overscroll-contain bg-paper p-4 pb-8 shadow-[0_2px_0_var(--pencil)] sm:rounded-none`}
      >
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-hand text-2xl text-ink">{title}</h2>
          <IconButton onClick={onClose} ariaLabel="Kapat">
            <CloseIcon className="h-5 w-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
