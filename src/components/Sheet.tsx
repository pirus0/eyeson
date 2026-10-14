"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { CloseIcon } from "./Icons";
import { IconButton } from "./IconButton";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional one-line caption under the title. */
  subtitle?: string;
  /** AddItemSheet opens taller (92vh) than the other panels (85vh). */
  maxHeightClassName?: string;
  children: React.ReactNode;
};

const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 600;

/** Shared bottom-sheet shell — scrim, sliding card, grab handle, header —
 * used by every overlay panel (add-item, reminders, settings) so they can't
 * drift from each other. Dragging the handle/header down dismisses it; the
 * body stays a normal scroll area so pickers inside it keep working.
 *
 * `propagate` lets a parent AnimatePresence (CalendarApp mounts AddItemSheet
 * conditionally) still play this sheet's exit animation on unmount. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  maxHeightClassName = "max-h-[85vh]",
  children,
}: Props) {
  const dragControls = useDragControls();

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) onClose();
  }

  return (
    <AnimatePresence propagate>
      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
          <motion.div
            key="scrim"
            className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] sm:rounded-[28px] ${maxHeightClassName}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={handleDragEnd}
          >
            <div
              className="shrink-0 cursor-grab touch-none px-5 pt-2.5 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" />
              <div className="flex items-center justify-between pt-3 pb-2">
                <div className="min-w-0">
                  <h2 className="font-display text-[22px] font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                  {subtitle && <p className="text-[13px] text-ink-faint">{subtitle}</p>}
                </div>
                <IconButton onClick={onClose} ariaLabel="Kapat" className="-mr-2 bg-ink/5 text-ink-soft">
                  <CloseIcon className="h-5 w-5" />
                </IconButton>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
