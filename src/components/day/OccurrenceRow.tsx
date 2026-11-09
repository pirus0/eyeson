"use client";

import type { Occurrence } from "@/lib/occurrences";
import { creditCardCompanionDate, occurrenceAmount, occurrenceImportance } from "@/lib/occurrences";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import type { AnyItem } from "@/lib/types";
import { formatShort, todayKey } from "@/lib/date";
import { formatAmount, IMPORTANCE_DOT_CLASS, itemTitle, KIND_SHORT } from "@/lib/itemMeta";
import { ReassignIcon, TrashIcon } from "../Icons";
import { CheckCircle } from "./CheckCircle";
import { ReassignForm } from "./ReassignForm";
import { StatementAmount } from "./StatementAmount";

/** Which action strip a row has been swiped open to: "delete" sits on the
 * left (row swiped right), "reassign" on the right (row swiped left). */
export type SwipeSide = "delete" | "reassign";
export type OpenSwipe = { key: string; side: SwipeSide } | null;

type RowProps = {
  occ: Occurrence;
  overdue?: boolean;
  swipe: SwipeSide | null;
  /** Keyed so one stable function serves every row (see rowPropsEqual). */
  onSwipeChange: (key: string, side: SwipeSide | null) => void;
  onToggleDone: (key: string, done: boolean) => void;
  onRemove: (kind: Occurrence["item"]["kind"], id: string) => void;
  /** Whether this row's long-press "Düzenle" bubble is showing. */
  editOpen: boolean;
  onEditOpenChange: (key: string, open: boolean) => void;
  onEdit: (item: AnyItem) => void;
  /** Position in the list — staggers the entrance when a day opens. */
  index?: number;
};

const ROW_SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;
const SNAP_SPRING = { type: "spring", stiffness: 520, damping: 42 } as const;
/** Width of a revealed action strip; also the min touch target is well met. */
const ACTION_WIDTH = 76;
const LONG_PRESS_MS = 480;
/** Finger travel that turns a press into a drag/scroll instead. */
const LONG_PRESS_SLOP = 8;

// A tick changes one row; the others keep equal props and skip re-rendering
// (and motion's layout measuring), which is what kept a tick slow on phones.
function sameOccurrence(a: Occurrence, b: Occurrence): boolean {
  return a.key === b.key && a.done === b.done && a.item === b.item && a.role === b.role &&
    a.carriedOverdue === b.carriedOverdue && a.cardAmount === b.cardAmount &&
    a.dateKey === b.dateKey && a.installmentProgress?.index === b.installmentProgress?.index &&
    a.installmentProgress?.total === b.installmentProgress?.total;
}
function rowPropsEqual(a: RowProps, b: RowProps): boolean {
  return sameOccurrence(a.occ, b.occ) && a.overdue === b.overdue && a.swipe === b.swipe &&
    a.editOpen === b.editOpen && a.index === b.index && a.onSwipeChange === b.onSwipeChange &&
    a.onToggleDone === b.onToggleDone && a.onRemove === b.onRemove &&
    a.onEditOpenChange === b.onEditOpenChange && a.onEdit === b.onEdit;
}

export const OccurrenceRow = memo(function OccurrenceRow({
  occ,
  overdue = false,
  swipe,
  onSwipeChange: onSwipeChangeFor,
  onToggleDone,
  onRemove,
  editOpen,
  onEditOpenChange: onEditOpenChangeFor,
  onEdit,
  index = 0,
}: RowProps) {
  const rowKey = occ.key;
  const onSwipeChange = useCallback((side: SwipeSide | null) => onSwipeChangeFor(rowKey, side), [onSwipeChangeFor, rowKey]);
  const onEditOpenChange = useCallback((open: boolean) => onEditOpenChangeFor(rowKey, open), [onEditOpenChangeFor, rowKey]);
  const [reassigning, setReassigning] = useState(false);
  const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const longPressedRef = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  function cancelPress() {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }

  // Any touch outside the bubble closes it.
  useEffect(() => {
    if (!editOpen) return;
    const close = (e: PointerEvent) => {
      if (bubbleRef.current?.contains(e.target as Node)) return;
      onEditOpenChange(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [editOpen, onEditOpenChange]);

  useEffect(() => cancelPress, []);
  const { item } = occ;
  const canReassign = item.kind === "oneOff";
  const x = useMotionValue(0);
  // The strips grow with the drag instead of sitting under the row, so
  // nothing shows through the translucent overdue background at rest.
  // Below 1px a strip is hidden outright: a sub-pixel sliver otherwise shows
  // as a thin line along the row's rounded corner.
  const deleteWidth = useTransform(x, (v) => (v >= 1 ? v : 0));
  const reassignWidth = useTransform(x, (v) => (v <= -1 ? -v : 0));
  // The strips' 3px padding would keep a closed one 6px wide, so a closed
  // strip is taken out of the layout entirely.
  const deleteDisplay = useTransform(deleteWidth, (w) => (w > 0 ? "flex" : "none"));
  const reassignDisplay = useTransform(reassignWidth, (w) => (w > 0 ? "flex" : "none"));
  const draggedRef = useRef(false);

  useEffect(() => {
    const target = swipe === "delete" ? ACTION_WIDTH : swipe === "reassign" ? -ACTION_WIDTH : 0;
    // Springs come to rest within ~0.5px of the target; land exactly on it.
    const controls = animate(x, target, { ...SNAP_SPRING, onComplete: () => x.set(target) });
    return () => controls.stop();
  }, [swipe, x]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const pos = x.get() + info.velocity.x * 0.1;
    if (pos > ACTION_WIDTH / 2) onSwipeChange("delete");
    else if (pos < -ACTION_WIDTH / 2 && canReassign) onSwipeChange("reassign");
    else {
      onSwipeChange(null);
      animate(x, 0, { ...SNAP_SPRING, onComplete: () => x.set(0) });
    }
    // Let the click that ends a drag pass by without ticking the row.
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  }
  const isCreditCard = item.kind === "creditCard";
  const isStatementRow = isCreditCard && occ.role === "statement";
  const amount = occurrenceAmount(occ);
  const importance = occurrenceImportance(occ);
  const companionLabel = isCreditCard
    ? `${occ.role === "due" ? "Kesim" : "Son ödeme"}: ${formatShort(
        creditCardCompanionDate(item, occ.date, occ.role!)
      )}`
    : null;

  const meta = [
    overdue ? formatShort(occ.date) : null,
    occ.installmentProgress
      ? `${occ.installmentProgress.index}/${occ.installmentProgress.total}. taksit`
      : null,
    companionLabel,
  ].filter(Boolean);

  return (
    <motion.li
      // Overdue rows never reorder (a ticked one just leaves), so they skip
      // layout tracking: with many of them it measured every row on each tick.
      layout={overdue ? false : "position"}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { ...ROW_SPRING, delay: Math.min(index * 0.035, 0.25) } }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={ROW_SPRING}
      className="relative"
    >
      <div className="relative overflow-hidden rounded-2xl">
        <motion.button
          type="button"
          onClick={() => onRemove(item.kind, item.id)}
          aria-label="Sil"
          tabIndex={swipe === "delete" ? 0 : -1}
          style={{ width: deleteWidth, display: deleteDisplay }}
          className="absolute inset-y-0 left-0 flex overflow-hidden p-[3px] text-iris"
        >
          {/* Inset by 3px so the row's own background frames the strip. */}
          <span className="flex flex-1 items-center justify-center rounded-[13px] bg-iris-soft">
            <TrashIcon className="h-[22px] w-[22px] shrink-0" />
          </span>
        </motion.button>
        {canReassign && (
          <motion.button
            type="button"
            onClick={() => {
              onSwipeChange(null);
              setReassigning(true);
            }}
            aria-label="Yeniden ata"
            tabIndex={swipe === "reassign" ? 0 : -1}
            style={{ width: reassignWidth, display: reassignDisplay }}
            className="absolute inset-y-0 right-0 flex overflow-hidden p-[3px] text-amber"
          >
            <span className="flex flex-1 items-center justify-center rounded-[13px] bg-amber-soft">
              <ReassignIcon className="h-[22px] w-[22px] shrink-0" />
            </span>
          </motion.button>
        )}
        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: canReassign ? -ACTION_WIDTH : 0, right: ACTION_WIDTH }}
          dragElastic={0.12}
          dragMomentum={false}
          style={{ x }}
          onDragStart={() => {
            draggedRef.current = true;
            cancelPress();
          }}
          onPointerDown={(e) => {
            longPressedRef.current = false;
            cancelPress();
            const { clientX: x0, clientY: y0 } = e;
            pressRef.current = {
              x: x0,
              y: y0,
              timer: window.setTimeout(() => {
                pressRef.current = null;
                longPressedRef.current = true;
                onSwipeChange(null);
                onEditOpenChange(true);
                navigator.vibrate?.(10);
              }, LONG_PRESS_MS),
            };
          }}
          onPointerMove={(e) => {
            const p = pressRef.current;
            if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP) cancelPress();
          }}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          onDragEnd={handleDragEnd}
          onClickCapture={(e) => {
            // The click that ends a long press only opens the bubble.
            if (longPressedRef.current) {
              longPressedRef.current = false;
              e.stopPropagation();
              e.preventDefault();
              return;
            }
            // While open, a tap on the row just closes it.
            if (draggedRef.current || swipe) {
              e.stopPropagation();
              e.preventDefault();
              if (swipe) onSwipeChange(null);
            }
          }}
          className="relative flex touch-pan-y items-center gap-3 px-3 py-2.5 select-none [-webkit-touch-callout:none]"
        >
          {isStatementRow ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
            </span>
          ) : (
            <CheckCircle done={occ.done} onClick={() => onToggleDone(occ.key, !occ.done)} />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {importance && (
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${IMPORTANCE_DOT_CLASS[importance]} ${
                    occ.done ? "opacity-40" : ""
                  }`}
                  title="Önem"
                />
              )}
              <p
                className={[
                  "relative text-[15px] leading-snug font-medium transition-colors duration-300",
                  occ.done ? "text-ink-faint" : overdue ? "text-iris" : "text-ink",
                ].join(" ")}
              >
                <span className={`strike ${occ.done && !isStatementRow ? "strike-on" : ""}`}>
                  {itemTitle(item)}
                  {isStatementRow && " · kesim"}
                </span>
              </p>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-faint">
              <span className="rounded-full bg-ink/5 px-1.5 py-px text-[10.5px] font-semibold tracking-wide uppercase">
                {KIND_SHORT[item.kind]}
              </span>
              {meta.map((m) => (
                <span key={m as string} className={overdue ? "text-iris/80" : undefined}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          {amount !== undefined && !isStatementRow && (
            <span
              className={`tabular shrink-0 text-[14px] font-semibold ${
                occ.done ? "text-ink-faint line-through" : overdue ? "text-iris" : "text-ink"
              }`}
            >
              {formatAmount(amount)}
            </span>
          )}

        </motion.div>
      </div>
      {isStatementRow && occ.dateKey <= todayKey() && <StatementAmount occ={occ} />}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            ref={bubbleRef}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 600, damping: 36 }}
            className="absolute bottom-full left-1/2 z-20 -mb-1 -translate-x-1/2"
          >
            <button
              type="button"
              onClick={() => {
                onEditOpenChange(false);
                onEdit(item);
              }}
              className="press min-h-11 rounded-full bg-ink px-5 text-[15px] font-semibold text-paper shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]"
            >
              Düzenle
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {reassigning && item.kind === "oneOff" && (
          <ReassignForm
            key="reassign"
            id={item.id}
            initialImportance={item.importance}
            onClose={() => setReassigning(false)}
          />
        )}
      </AnimatePresence>
    </motion.li>
  );
}, rowPropsEqual);
