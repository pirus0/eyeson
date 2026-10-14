import { useId } from "react";

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.4 5.4 2 6.5H4c.6-1.1 2-2.5 2-6.5Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
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
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M14.5 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronUpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 14.5l6-6 6 6" />
    </svg>
  );
}

/** Two chasing arrows — "yeniden ata" on an overdue one-off task. */
export function ReassignIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5" />
      <path d="M5 3v4h4M19 21v-4h-4" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7m-8 0 .9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L18 7" />
    </svg>
  );
}

/** Header mark — the app icon's almond eye with its rust pupil. The lid
 * group is what blinks (scaleY), so it's wrapped separately from the svg. */
export function BrandEye({ className, blinking = false }: IconProps & { blinking?: boolean }) {
  return (
    <svg viewBox="0 0 40 24" className={className} aria-hidden>
      <g className={blinking ? "eye-blink" : undefined} style={{ transformBox: "fill-box" }}>
        <path d="M1.5 12C9 2 31 2 38.5 12 31 22 9 22 1.5 12Z" fill="var(--ink)" />
        <circle cx="20" cy="12" r="5.2" fill="var(--iris)" />
      </g>
    </svg>
  );
}

/** High-importance day marker: almond eye + top/bottom eyelash rays, traced
 * from the supplied red.svg asset (exact path data, not redrawn) — fill is
 * `currentColor` instead of the asset's baked hex so it can switch between
 * the pending (red-pen) and settled (faint) colors, and stay correct in
 * dark mode. No pupil — the day number sits inside the eye. */
export function EyeUrgentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 433.36 365.2" className={className} fill="currentColor">
      <path d="M30.57,179.01s178.78-216.49,371.45,0c0,0-161.43,232.64-371.45,0Z" />
      <g>
        <path d="M231.65,53.53V14.31c0-19.06-29.63-19.1-29.63,0v39.22c0,19.06,29.63,19.1,29.63,0h0Z" />
        <path d="M133.02,67.92c-4.66-12.22-9.31-24.43-13.97-36.65-2.85-7.47-9.98-12.61-18.22-10.35-7.16,1.97-13.21,10.71-10.35,18.22,4.66,12.22,9.31,24.43,13.97,36.65,2.85,7.47,9.98,12.61,18.22,10.35,7.16-1.97,13.21-10.71,10.35-18.22h0Z" />
        <path d="M41.05,112.62c-5.31-6.48-10.61-12.95-15.92-19.43-4.93-6.02-15.9-5.5-20.95,0-5.87,6.4-5.26,14.53,0,20.95,5.31,6.48,10.61,12.95,15.92,19.43,4.93,6.02,15.9,5.5,20.95,0,5.87-6.4,5.26-14.53,0-20.95h0Z" />
        <path d="M329.23,75.8c4.66-12.22,9.31-24.43,13.97-36.65,2.85-7.48-3.16-16.25-10.35-18.22-8.34-2.29-15.36,2.84-18.22,10.35-4.66,12.22-9.31,24.43-13.97,36.65-2.85,7.48,3.16,16.25,10.35,18.22,8.34,2.29,15.36-2.84,18.22-10.35h0Z" />
        <path d="M413.58,133.57c5.19-6.33,10.38-12.67,15.57-19,4.9-5.98,6.29-15.17,0-20.95-5.43-4.99-15.71-6.4-20.95,0-5.19,6.33-10.38,12.67-15.57,19-4.9,5.98-6.29,15.17,0,20.95,5.43,4.99,15.71,6.4,20.95,0h0Z" />
      </g>
      <g>
        <path d="M202.03,311.67v39.22c0,19.06,29.63,19.1,29.63,0v-39.22c0-19.06-29.63-19.1-29.63,0h0Z" />
        <path d="M300.66,297.28c4.66,12.22,9.31,24.43,13.97,36.65,2.85,7.47,9.98,12.61,18.22,10.35,7.16-1.97,13.21-10.71,10.35-18.22-4.66-12.22-9.31-24.43-13.97-36.65-2.85-7.47-9.98-12.61-18.22-10.35-7.16,1.97-13.21,10.71-10.35,18.22h0Z" />
        <path d="M392.63,252.58c5.02,6.12,10.03,12.24,15.05,18.36,4.93,6.02,15.9,5.5,20.95,0,5.87-6.4,5.26-14.53,0-20.95-5.02-6.12-10.03-12.24-15.05-18.36-4.93-6.02-15.9-5.5-20.95,0-5.87,6.4-5.26,14.53,0,20.95,5.02,6.12,10.03,12.24,15.05,18.36,4.93,6.02,15.9,5.5,20.95,0,5.87-6.4,5.26-14.53,0-20.95-5.02-6.12-10.03-12.24-15.05-18.36-4.93-6.02-15.9-5.5-20.95,0-5.87,6.4-5.26,14.53,0,20.95Z" />
        <path d="M104.45,289.41c-4.66,12.22-9.31,24.43-13.97,36.65-2.85,7.48,3.16,16.25,10.35,18.22,8.34,2.29,15.36-2.84,18.22-10.35,4.66-12.22,9.31-24.43,13.97-36.65,2.85-7.48-3.16-16.25-10.35-18.22-8.34-2.29-15.36,2.84-18.22,10.35h0Z" />
        <path d="M20.1,231.63c-4.83,5.89-9.66,11.79-14.49,17.68-4.9,5.98-6.29,15.17,0,20.95,5.43,4.99,15.71,6.4,20.95,0,4.83-5.89,9.66-11.79,14.49-17.68,4.9-5.98,6.29-15.17,0-20.95-5.43-4.99-15.71-6.4-20.95,0h0Z" />
      </g>
    </svg>
  );
}

/** What EyeUrgentIcon turns into once its (high-importance) task is checked
 * off — a shut eyelid instead of the same open eye faded down, traced from
 * the supplied redturnoff.svg asset. `currentColor` so it can carry the same
 * faint "settled" tone as every other done-state indicator in this app. */
export function EyeUrgentDoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 368.83 102.9" className={className} fill="currentColor">
      <path d="M0,0c7.43,4.97,14.75,9.7,22.14,14.16,7.4,4.44,14.82,8.64,22.32,12.53,14.97,7.81,30.17,14.48,45.56,19.91,15.42,5.35,31,9.54,46.75,12.23,15.73,2.78,31.63,4.03,47.53,4.08,7.94-.1,15.89-.31,23.79-1.11,7.92-.62,15.8-1.79,23.67-3.14,7.87-1.35,15.68-3.2,23.48-5.22,1.93-.56,3.89-1.08,5.84-1.61,1.95-.54,3.86-1.19,5.81-1.76.97-.3,1.95-.57,2.92-.89l2.89-.97c1.92-.67,3.89-1.24,5.79-1.97,15.41-5.43,30.63-12.13,45.65-19.87,7.51-3.87,14.99-8,22.43-12.38,7.41-4.42,14.8-9.05,22.25-13.98-4.15,7.95-9.32,15.32-14.9,22.36-5.62,7.02-11.73,13.7-18.28,19.96-6.55,6.26-13.53,12.13-20.88,17.57-7.35,5.44-15.05,10.49-23.12,14.96-8.06,4.5-16.41,8.57-25.04,12.06-2.15.9-4.35,1.66-6.52,2.5l-3.28,1.22-3.32,1.09c-2.22.71-4.44,1.47-6.68,2.14l-6.77,1.86c-2.25.66-4.54,1.15-6.83,1.66-2.29.49-4.57,1.08-6.88,1.48-4.61.84-9.24,1.67-13.9,2.22l-3.5.44c-1.16.15-2.33.28-3.5.36l-7.02.57c-2.34.21-4.69.21-7.04.3-2.35.05-4.69.18-7.04.16-18.76-.07-37.55-2.32-55.67-7.06-18.14-4.64-35.56-11.72-51.7-20.72-16.13-9.01-30.94-20.05-44.02-32.61-6.54-6.28-12.61-13.01-18.18-20.07C9.22,15.37,4.13,7.95,0,0Z" />
    </svg>
  );
}

/** Medium-importance day marker: plain almond eye, no lashes — traced from
 * the supplied black.svg asset. `currentColor` fill for the same
 * pending/settled and dark-mode handling as EyeUrgentIcon. */
export function EyeMediumIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 371.45 199.61" className={className} fill="currentColor">
      <path d="M0,96.22s178.78-216.49,371.45,0c0,0-161.43,232.64-371.45,0Z" />
    </svg>
  );
}

const ALMOND = "s178.78-216.49,371.45,0c0,0-161.43,232.64-371.45,0Z";

/** Selected-day marker: the importance eyes' own almond, outlined. It uses
 * the same viewBox as the eye it frames ("urgent" = EyeUrgentIcon's lashed
 * box, "plain" = EyeMediumIcon's), so at the same scale class it lines up
 * exactly with that eye. Every stroke is clipped to the almond, so the frame
 * never reaches past the eye's edge into a neighbouring day. With `gap`, a
 * surface-coloured band is cut just inside the edge, turning the filled eye
 * into a lens: rim, thin gap, then the eye. */
export function EyeOutlineIcon({
  className,
  variant = "plain",
  gap = false,
}: IconProps & { variant?: "urgent" | "plain"; gap?: boolean }) {
  const clipId = useId();
  const urgent = variant === "urgent";
  const d = urgent ? `M30.57,179.01${ALMOND}` : `M0,96.22${ALMOND}`;
  const stroke = {
    vectorEffect: "non-scaling-stroke",
    strokeLinejoin: "round",
    fill: "none",
    clipPath: `url(#${clipId})`,
  } as const;
  return (
    <svg viewBox={urgent ? "0 0 433.36 365.2" : "0 0 371.45 199.61"} className={className}>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      {gap ? (
        <>
          <path d={d} {...stroke} stroke="var(--surface)" strokeWidth={6.5} />
          <path d={d} {...stroke} stroke="currentColor" strokeWidth={3.75} />
        </>
      ) : (
        <path d={d} {...stroke} stroke="currentColor" strokeWidth={4.5} />
      )}
    </svg>
  );
}

export function QuestionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 9.3a3.2 3.2 0 1 1 5.2 2.5c-1.2.9-2.2 1.6-2.2 3.2" />
      <circle cx="12" cy="18.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloudSyncIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7 17.5a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.4 8.6a4.2 4.2 0 0 1-.4 8.9H7Z" />
      <path d="M12 10.5v5.5M9.6 13.8 12 16.2l2.4-2.4" />
    </svg>
  );
}
