"use client";

type Props = {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  /** Defaults to the plain toolbar look; pass extra classes for a trigger
   * that carries a badge or an active state. */
  className?: string;
};

/** The round 44px tap-target icon button used throughout the header/toolbar
 * (month nav, sheet close buttons, sheet triggers). */
export function IconButton({ onClick, ariaLabel, children, className = "text-ink-soft" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`press relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5 active:bg-ink/10 ${className}`}
    >
      {children}
    </button>
  );
}
