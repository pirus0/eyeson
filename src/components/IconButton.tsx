"use client";

type Props = {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  /** Defaults to the plain toolbar look; pass "relative text-ink" for a
   * sheet trigger that carries a badge. */
  className?: string;
};

/** The round 44px tap-target icon button used throughout the header/toolbar
 * (month nav, theme toggle, sheet close buttons, sheet triggers). */
export function IconButton({ onClick, ariaLabel, children, className = "text-ink-soft" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex h-11 w-11 items-center justify-center rounded-full active:bg-graphite-wash ${className}`}
    >
      {children}
    </button>
  );
}
