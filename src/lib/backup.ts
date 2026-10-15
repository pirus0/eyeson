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
