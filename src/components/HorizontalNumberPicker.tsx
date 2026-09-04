"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};

// Matches the h-11/w-11 touch target used everywhere else in the app.
const ITEM_WIDTH = 44;
const GAP = 8; // Tailwind gap-2
const STEP = ITEM_WIDTH + GAP;
const SPACER = `calc(50% - ${ITEM_WIDTH / 2}px)`;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Horizontal scroll-snap replacement for a plain number <input> — shared by
 * every "which day of the month" / "how many installments" field so they use
 * one physical interaction instead of the OS's native number stepper (same
 * motivation as the iOS app's HorizontalNumberPicker, see project memory).
 * The web version leans on native CSS scroll-snap for the settle behavior
 * instead of hand-rolled physics. */
export function HorizontalNumberPicker({ min, max, value, onChange }: Props) {
  const options = useMemo(() => {
    const list: number[] = [];
    for (let n = min; n <= max; n++) list.push(n);
    return list;
  }, [min, max]);

  const trackRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  // While a click-triggered smooth scroll is animating, ignore the scroll
  // handler's own reading so it doesn't fight the target value mid-flight.
  const suppressScroll = useRef(false);

  useEffect(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    const index = clamp(value, min, max) - min;
    trackRef.current?.scrollTo({ left: index * STEP, behavior: "auto" });
  }, [value, min, max]);

  function handleScroll() {
    if (suppressScroll.current || !trackRef.current) return;
    const index = Math.round(trackRef.current.scrollLeft / STEP);
    const next = clamp(min + index, min, max);
    if (next !== value) onChange(next);
  }

  function handleClick(n: number) {
    suppressScroll.current = true;
    onChange(n);
    trackRef.current?.scrollTo({ left: (n - min) * STEP, behavior: "smooth" });
    window.setTimeout(() => {
      suppressScroll.current = false;
    }, 400);
  }

  return (
    <div
      ref={trackRef}
      onScroll={handleScroll}
      className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
    >
      <div className="shrink-0" style={{ width: SPACER }} aria-hidden />
      <div className="flex shrink-0 gap-2">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleClick(n)}
            className={[
              "sketch-box flex h-11 w-11 shrink-0 snap-center items-center justify-center text-sm font-medium",
              n === value ? "bg-ink text-paper" : "text-ink-soft",
            ].join(" ")}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="shrink-0" style={{ width: SPACER }} aria-hidden />
    </div>
  );
}
