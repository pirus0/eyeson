import type { StoreData } from "./types";

export type BackupFile = { app: "eyeson"; version: 1; exportedAt: string; data: StoreData };

function backupFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `eyeson-yedek-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** Hands the backup to the phone's share sheet (WhatsApp, Notes, Files…)
 * where supported, otherwise falls back to a plain download. Returns false
 * only when the person closed the share sheet without picking anything. */
export async function shareBackup(data: StoreData): Promise<boolean> {
  const payload: BackupFile = {
    app: "eyeson",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  const name = backupFileName();
  const file = new File([JSON.stringify(payload)], name, { type: "application/json" });

  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Eyes On yedeği" });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return false;
      // Any other share failure: fall through to the download below.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Fragment marker for import links. Everything after `#` stays in the
 * browser — it's never sent to GitHub Pages — so the data only ever lives
 * inside the message the link was sent in. */
export const LINK_MARKER = "yukle=";
export const APP_URL = "https://pirus0.github.io/eyeson/";

const LIST_KEYS = [
  "bills",
  "installments",
  "recurringTodos",
  "weeklyTodos",
  "oneOffs",
  "creditCards",
] as const;

const KIND_BY_LIST: Record<(typeof LIST_KEYS)[number], string> = {
  bills: "bill",
  installments: "installment",
  recurringTodos: "recurringTodo",
  weeklyTodos: "weeklyTodo",
  oneOffs: "oneOff",
  creditCards: "creditCard",
};

function fromBase64Url(code: string): Uint8Array {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Reverses scripts/make-import-link.mjs (node zlib deflateRaw + base64url). */
async function decodeLinkCode(code: string): Promise<unknown> {
  const raw = await inflate(fromBase64Url(code));
  return JSON.parse(new TextDecoder().decode(raw));
}

/** Keeps only well-formed records, so a half-copied or foreign file can't
 * put something into the store that the calendar code would trip over. */
function normalize(input: unknown): StoreData | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const source = (obj.app === "eyeson" && obj.data && typeof obj.data === "object"
    ? obj.data
    : obj) as Record<string, unknown>;
  if (!LIST_KEYS.some((k) => Array.isArray(source[k]))) return null;

  const out = {} as StoreData;
  for (const key of LIST_KEYS) {
    const list = Array.isArray(source[key]) ? (source[key] as unknown[]) : [];
    (out[key] as unknown[]) = list.filter(
      (x): x is Record<string, unknown> =>
        !!x &&
        typeof x === "object" &&
        typeof (x as Record<string, unknown>).id === "string" &&
        (x as Record<string, unknown>).kind === KIND_BY_LIST[key]
    );
  }
  const completions = source.completions;
  out.completions =
    completions && typeof completions === "object" && !Array.isArray(completions)
      ? (completions as StoreData["completions"])
      : {};
  return out;
}

/** Accepts whatever the person managed to paste or pick: a whole import
 * link, just the code after `yukle=`, or the JSON of a shared backup file. */
export async function parseImport(text: string): Promise<StoreData | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith("{")) return normalize(JSON.parse(trimmed));
    const at = trimmed.indexOf(LINK_MARKER);
    const code = (at >= 0 ? trimmed.slice(at + LINK_MARKER.length) : trimmed).split(/[\s&]/)[0];
    return normalize(await decodeLinkCode(code));
  } catch {
    return null;
  }
}

export function countItems(data: StoreData): number {
  return LIST_KEYS.reduce((n, k) => n + data[k].length, 0);
}

export function itemNames(data: StoreData): string[] {
  return LIST_KEYS.flatMap((k) =>
    (data[k] as Array<{ name?: string; title?: string }>).map((x) => x.name ?? x.title ?? "")
  ).filter(Boolean);
}

/** Adds incoming records whose id isn't here yet and never overwrites
 * existing ones, so opening the same link twice can't create duplicates or
 * undo edits made since. Ticks already on this device win over incoming ones. */
export function mergeData(local: StoreData, incoming: StoreData): { merged: StoreData; added: number } {
  let added = 0;
  const merged = { ...local };
  for (const key of LIST_KEYS) {
    const ids = new Set(local[key].map((x) => x.id));
    const fresh = (incoming[key] as Array<{ id: string }>).filter((x) => !ids.has(x.id));
    added += fresh.length;
    (merged[key] as unknown[]) = [...local[key], ...fresh];
  }
  merged.completions = { ...incoming.completions, ...local.completions };
  return { merged, added };
}

export async function readClipboard(): Promise<string | null> {
  try {
    return (await navigator.clipboard?.readText()) ?? null;
  } catch {
    return null;
  }
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
