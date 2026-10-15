"use client";

import type { Occurrence } from "@/lib/occurrences";
import { creditCardCompanionDate, occurrenceAmount, occurrenceImportance } from "@/lib/occurrences";
import { useEffect, useRef, useState } from "react";
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
import type { CompletionMap, Importance } from "@/lib/types";
import { formatShort, todayKey } from "@/lib/date";
import {
  FIELD_LABEL_CLASS,
  formatAmount,
  IMPORTANCE_DOT_CLASS,
  INPUT_CLASS,
  itemTitle,
  KIND_SHORT,
} from "@/lib/itemMeta";
import { EyeMediumIcon, PlusIcon, ReassignIcon, TrashIcon } from "./Icons";
import { ImportanceSelector } from "./ImportanceSelector";
import { useStore } from "@/lib/store";

type Props = {
  day: Date;
  occurrences: Occurrence[];
  onAdd: () => void;
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
  onSwipeChange: (side: SwipeSide | null) => void;
  onToggleDone: (key: string, done: boolean) => void;
  onRemove: (kind: Occurrence["item"]["kind"], id: string) => void;
  /** Position in the list — staggers the entrance when a day opens. */
  index?: number;
};

const ROW_SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;
const SNAP_SPRING = { type: "spring", stiffness: 520, damping: 42 } as const;
/** Width of a revealed action strip; also the min touch target is well met. */
const ACTION_WIDTH = 76;

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

function OccurrenceRow({
  occ,
  overdue = false,
  swipe,
  onSwipeChange,
  onToggleDone,
  onRemove,
  index = 0,
}: RowProps) {
  const [reassigning, setReassigning] = useState(false);
  const { item } = occ;
  const canReassign = item.kind === "oneOff";
  const x = useMotionValue(0);
  // The strips grow with the drag instead of sitting under the row, so
  // nothing shows through the translucent overdue background at rest.
  // Below 1px a strip is hidden outright: a sub-pixel sliver otherwise shows
  // as a thin line along the row's rounded corner.
  const deleteWidth = useTransform(x, (v) => (v >= 1 ? v : 0));
  const reassignWidth = useTransform(x, (v) => (v <= -1 ? -v : 0));
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
      layout="position"
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
          style={{ width: deleteWidth }}
          className="absolute inset-y-0 left-0 flex items-center justify-center overflow-hidden bg-iris-soft text-iris"
        >
          <TrashIcon className="h-[22px] w-[22px] shrink-0" />
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
            style={{ width: reassignWidth }}
            className="absolute inset-y-0 right-0 flex items-center justify-center overflow-hidden bg-amber-soft text-amber"
          >
            <ReassignIcon className="h-[22px] w-[22px] shrink-0" />
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
          }}
          onDragEnd={handleDragEnd}
          onClickCapture={(e) => {
            // While open, a tap on the row just closes it.
            if (draggedRef.current || swipe) {
              e.stopPropagation();
              e.preventDefault();
              if (swipe) onSwipeChange(null);
            }
          }}
          className="relative flex touch-pan-y items-center gap-3 px-3 py-2.5"
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
                {itemTitle(item)}
                {isStatementRow && " · kesim"}
                <motion.span
                  aria-hidden
                  className="absolute top-1/2 left-0 h-[1.5px] w-full origin-left bg-ink-faint"
                  initial={false}
                  animate={{ scaleX: occ.done ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                />
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

          {amount !== undefined && (
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
}

export function DayPanel({ day, occurrences, onAdd }: Props) {
  const { setDone, removeItem, data } = useStore();
  const [openSwipe, setOpenSwipe] = useState<OpenSwipe>(null);
  const swipeProps = (key: string) => ({
    swipe: openSwipe?.key === key ? openSwipe.side : null,
    onSwipeChange: (side: SwipeSide | null) => setOpenSwipe(side ? { key, side } : null),
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-1 mb-2 rounded-[22px] bg-iris-soft pt-2.5 pb-1">
              <p className="flex items-center gap-1.5 px-3 pb-0.5 text-[11px] font-semibold tracking-[0.08em] text-iris uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-iris" />
                Gecikmiş · {overdue.length}
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
