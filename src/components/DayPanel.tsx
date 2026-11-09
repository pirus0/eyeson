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
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { AnyItem, CompletionMap, Importance } from "@/lib/types";
import { formatShort, todayKey } from "@/lib/date";
import {
  FIELD_LABEL_CLASS,
  formatAmount,
  IMPORTANCE_DOT_CLASS,
  INPUT_CLASS,
  itemTitle,
  KIND_SHORT,
} from "@/lib/itemMeta";
import { CheckIcon, EyeMediumIcon, PlusIcon, ReassignIcon, TrashIcon } from "./Icons";
import { ImportanceSelector } from "./ImportanceSelector";
import { useStore } from "@/lib/store";

type Props = {
  day: Date;
  occurrences: Occurrence[];
  onAdd: () => void;
  onEdit: (item: AnyItem) => void;
};

const IMPORTANCE_RANK: Record<string, number> = {
  yuksek: 0,
  orta: 1,
  dusuk: 2,
};

function importanceRank(occ: Occurrence): number {
  const importance = occurrenceImportance(occ);
  return importance ? IMPORTANCE_RANK[importance] : 2;
}

/** Moment the item should be considered "ticked" for ordering purposes: when
 * it was checked off if done, else when it was created — so ties don't
 * reshuffle on every toggle. */
function tickOrder(occ: Occurrence, completions: CompletionMap): string {
  if (occ.done) return completions[occ.key]?.doneAt ?? occ.item.createdAt;
  return occ.item.createdAt;
}

/** Three-level sort: not-done before done (a done item never stays up top
 * just because it's high-importance — it always sinks below every pending
 * item); within each of those groups, importance order (yüksek > orta >
 * düşük/none); within a matching importance tier, tick order. */
function sortOccurrences(occs: Occurrence[], completions: CompletionMap): Occurrence[] {
  return [...occs].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ra = importanceRank(a);
    const rb = importanceRank(b);
    if (ra !== rb) return ra - rb;
    return tickOrder(a, completions).localeCompare(tickOrder(b, completions));
  });
}

/** Which action strip a row has been swiped open to: "delete" sits on the
 * left (row swiped right), "reassign" on the right (row swiped left). */
type SwipeSide = "delete" | "reassign";
type OpenSwipe = { key: string; side: SwipeSide } | null;

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

/** Under a credit card's statement row once its day has come: type what the
 * statement came to and tick — the due row of the same cycle then shows it.
 * Ticked, it shows the amount; tapping the tick again lets you correct it. */
function StatementAmount({ occ }: { occ: Occurrence }) {
  const { setDone, data } = useStore();
  const saved = data.completions[occ.key]?.amount;
  const [value, setValue] = useState(saved !== undefined ? String(saved) : "");
  const n = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(n) && n >= 0;

  return (
    <div className="flex items-center gap-2 px-3 pb-2.5 pl-[52px]">
      {occ.done ? (
        <span className="tabular flex min-h-11 flex-1 items-center text-[15px] font-semibold text-ink">
          {formatAmount(occ.cardAmount)}
        </span>
      ) : (
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) setDone(occ.key, true, n);
          }}
          placeholder="Tutar gir"
          aria-label="Kesim tutarı"
          className={`${INPUT_CLASS} !min-h-11 flex-1`}
        />
      )}
      <button
        type="button"
        onClick={() => {
          if (occ.done) setDone(occ.key, false);
          else if (valid) setDone(occ.key, true, n);
        }}
        disabled={!occ.done && !valid}
        aria-label={occ.done ? "Tutarı düzelt" : "Tutarı kaydet"}
        aria-pressed={occ.done}
        className={[
          "press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] transition-colors duration-200",
          occ.done
            ? "border-ink bg-ink text-paper"
            : valid
              ? "border-ink text-ink"
              : "border-line text-ink-faint/50",
        ].join(" ")}
      >
        <CheckIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

/** Inline "move to another day" form under a one-off task — payments can't
 * be reassigned (their due date is fixed), recurring todos come back on
 * their own. */
function ReassignForm({
  id,
  initialImportance,
  onClose,
}: {
  id: string;
  initialImportance?: Importance;
  onClose: () => void;
}) {
  const { assignOneOff } = useStore();
  const [date, setDate] = useState(todayKey());
  const [importance, setImportance] = useState<Importance>(initialImportance ?? "orta");

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-3 px-3 pb-3">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASS}>Yeni tarih</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL_CLASS}>Önem</span>
          <ImportanceSelector value={importance} onChange={setImportance} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!date) return;
              assignOneOff(id, { date, importance });
              onClose();
            }}
            disabled={!date}
            className="press min-h-11 flex-1 rounded-full bg-ink text-[15px] font-semibold text-paper disabled:opacity-40"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={onClose}
            className="press min-h-11 rounded-full px-4 text-[15px] font-medium text-ink-soft hover:bg-ink/5"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Round check that draws its tick in when completed. */
function CheckCircle({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
      aria-pressed={done}
      className="press -m-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <motion.span
        className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px]"
        initial={false}
        animate={
          done
            ? { backgroundColor: "var(--ink)", borderColor: "var(--ink)", scale: [1, 1.18, 1] }
            : { backgroundColor: "rgba(0,0,0,0)", borderColor: "var(--ink-faint)", scale: 1 }
        }
        transition={{ duration: 0.28 }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="var(--paper)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={{ duration: 0.26, delay: done ? 0.06 : 0 }}
          />
        </svg>
      </motion.span>
    </button>
  );
}

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

const OccurrenceRow = memo(function OccurrenceRow({
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

export function DayPanel({ day, occurrences, onAdd, onEdit }: Props) {
  const { setDone, removeItem, data } = useStore();
  const [openSwipe, setOpenSwipe] = useState<OpenSwipe>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  // Stable across renders so unchanged rows can skip re-rendering.
  const onSwipeChange = useCallback(
    (key: string, side: SwipeSide | null) => setOpenSwipe(side ? { key, side } : null),
    []
  );
  const onEditOpenChange = useCallback(
    (key: string, open: boolean) => setEditKey((k) => (open ? key : k === key ? null : k)),
    []
  );
  const onEditRef = useRef(onEdit);
  useEffect(() => {
    onEditRef.current = onEdit;
  }, [onEdit]);
  const editItem = useCallback((item: AnyItem) => onEditRef.current(item), []);
  const swipeProps = (key: string) => ({
    swipe: openSwipe?.key === key ? openSwipe.side : null,
    onSwipeChange,
    editOpen: editKey === key,
    onEditOpenChange,
    onEdit: editItem,
  });

  const overdue = occurrences.filter((occ) => occ.carriedOverdue);
  const own = occurrences.filter((occ) => !occ.carriedOverdue);

  const sorted = sortOccurrences(own, data.completions);
  const openCount = own.filter((o) => !o.done && o.role !== "statement").length;
  const openTotal = own.reduce((sum, o) => {
    if (o.done || o.role === "statement") return sum;
    return sum + (occurrenceAmount(o) ?? 0);
  }, 0);
  const dayKey = format(day, "yyyy-MM-dd");

  return (
    <section className="mt-3 rounded-[28px] bg-surface px-2 pt-4 pb-3 shadow-[0_1px_0_var(--line),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={dayKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex min-w-0 items-center gap-3"
          >
            <span className="tabular font-display text-[40px] leading-none font-semibold tracking-tight text-ink">
              {day.getDate()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[15px] font-semibold text-ink capitalize">
                {format(day, "EEEE", { locale: tr })}
              </p>
              <p className="truncate text-[13px] text-ink-faint">
                {format(day, "LLLL yyyy", { locale: tr })}
                {openCount > 0 && ` · ${openCount} açık`}
                {openTotal > 0 && ` · ${formatAmount(openTotal)}`}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={onAdd}
          aria-label="Ekle"
          whileTap={{ scale: 0.9, rotate: 90 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-iris text-on-iris shadow-[0_8px_20px_-8px_var(--iris)]"
        >
          <PlusIcon className="h-[22px] w-[22px]" />
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {overdue.length > 0 && (
          <motion.div
            key="overdue"
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            // Clipping is only for the height animation — once open, the
            // first row's "Düzenle" bubble may stick out above the box.
            animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          >
            <div className="mx-1 mb-2 rounded-[22px] bg-iris-soft pt-2.5 pb-1">
              <p className="flex items-center gap-1.5 px-3 pb-0.5 text-[11px] font-semibold tracking-[0.08em] text-iris uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-iris" />
                Gecikmiş
              </p>
              <ul className="flex flex-col">
                <AnimatePresence initial={false}>
                  {overdue.map((occ) => (
                    <OccurrenceRow
                      key={occ.key}
                      occ={occ}
                      overdue
                      {...swipeProps(occ.key)}
                      onToggleDone={setDone}
                      onRemove={removeItem}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sorted.length === 0 ? (
        overdue.length === 0 && (
          <motion.div
            key={`empty-${dayKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 px-3 pt-4 pb-6 text-center"
          >
            <EyeMediumIcon className="h-5 w-9 text-ink-faint/30" />
            <p className="text-[14px] text-ink-faint">Bu günde bir şey yok.</p>
          </motion.div>
        )
      ) : (
        <ul key={dayKey} className="flex flex-col">
          <AnimatePresence>
            {sorted.map((occ, i) => (
              <OccurrenceRow
                key={occ.key}
                occ={occ}
                index={i}
                {...swipeProps(occ.key)}
                onToggleDone={setDone}
                onRemove={removeItem}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
