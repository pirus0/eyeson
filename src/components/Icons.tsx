type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Two retrace passes, each both nudged sideways (translate) and rotated —
 * translate alone guarantees a visible doubled line all the way around the
 * shape at icon size (a pure rotation barely moves points near its own
 * pivot, which is why the first cut at this looked like a single clean
 * stroke instead of pencil retrace). Shared by the header icons. */
const RETRACE_1 = { transform: "translate(0.9 -0.6) rotate(2.5 12 12)", strokeWidth: 1.15, opacity: 0.4 };
const RETRACE_2 = { transform: "translate(-0.8 0.7) rotate(-3 12 12)", strokeWidth: 1.35, opacity: 0.6 };

export function BellIcon({ className }: IconProps) {
  const bell = "M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z";
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d={bell} {...RETRACE_1} />
      <path d={bell} {...RETRACE_2} />
      <path d={bell} />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 13l4 4 10-10" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  const d = "M15 5l-7 7 7 7";
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d={d} transform="rotate(3 12 12)" strokeWidth={0.7} opacity={0.3} />
      <path d={d} transform="rotate(-2 12 12)" strokeWidth={0.9} opacity={0.45} />
      <path d={d} />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  const d = "M9 5l7 7-7 7";
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d={d} transform="rotate(-3 12 12)" strokeWidth={0.7} opacity={0.3} />
      <path d={d} transform="rotate(2 12 12)" strokeWidth={0.9} opacity={0.45} />
      <path d={d} />
    </svg>
  );
}

export function ChevronUpIcon({ className }: IconProps) {
  const d = "M5 15l7-7 7 7";
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d={d} transform="rotate(3 12 12)" strokeWidth={0.7} opacity={0.3} />
      <path d={d} transform="rotate(-2 12 12)" strokeWidth={0.9} opacity={0.45} />
      <path d={d} />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  );
}

/** Hand-sketched eye/lens: a filled almond silhouette plus a second faint
 * offset stroke, the same "drawn twice" trick used for the app icon and the
 * selected-day ring, so it reads as pencil rather than a clean vector icon.
 * No pupil dot — the day number sits where the pupil would be. */
export function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M2 12S6 5 12 5s10 7 10 7-4 7-10 7-10-7-10-7Z"
        fill="currentColor"
      />
      <path
        d="M2.6 11.6C3.4 9.9 6.9 5.6 12 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
        transform="rotate(2 12 11)"
      />
      <path
        d="M12 18.5c4.7-.1 8-4.9 9-6.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.4"
        transform="rotate(-2 12 12)"
      />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  const rays =
    "M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8";
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <g transform={RETRACE_1.transform} strokeWidth={RETRACE_1.strokeWidth} opacity={RETRACE_1.opacity}>
        <circle cx="12" cy="12" r="4.2" />
        <path d={rays} />
      </g>
      <g transform={RETRACE_2.transform} strokeWidth={RETRACE_2.strokeWidth} opacity={RETRACE_2.opacity}>
        <circle cx="12" cy="12" r="4.2" />
        <path d={rays} />
      </g>
      <circle cx="12" cy="12" r="4.2" />
      <path d={rays} />
    </svg>
  );
}

/** Same retrace treatment as BellIcon/CloudSyncIcon. */
export function QuestionIcon({ className }: IconProps) {
  const mark = "M8.5 9.2a3.6 3.6 0 1 1 5.9 2.8c-1.3.9-2.1 1.7-2.1 3.3";
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d={mark} {...RETRACE_1} />
      <path d={mark} {...RETRACE_2} />
      <path d={mark} />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Hand-sketched crescent: a filled shape plus a faint offset outline,
 * matching the FlameIcon "drawn twice" treatment. */
export function MoonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M20.2 14.8A8.6 8.6 0 1 1 9.3 3.9a7 7 0 0 0 10.9 10.9Z"
        fill="currentColor"
      />
      <path
        d="M19.5 15.4A8 8 0 0 1 9.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.4"
        transform="rotate(-2 14 10)"
      />
    </svg>
  );
}

export function CloudSyncIcon({ className }: IconProps) {
  const cloud = "M7 17a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.4 8.1 4.2 4.2 0 0 1 17 17H7Z";
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d={cloud} {...RETRACE_1} />
      <path d={cloud} {...RETRACE_2} />
      <path d={cloud} />
      <path d="M12 10.5v6M9.3 13.7 12 16.5l2.7-2.8" />
    </svg>
  );
}
