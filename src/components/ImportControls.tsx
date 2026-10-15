"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { parseImport, readClipboard } from "@/lib/backup";
import { INPUT_CLASS } from "@/lib/itemMeta";

type Status = { ok: boolean; text: string } | null;

/** Paste-a-link / pick-a-file import, shared by the settings panel and the
 * empty-calendar card. Clipboard reading needs the tap itself (iOS shows its
 * "Yapıştır" bubble); if the browser refuses, a text box takes over. */
export function ImportControls({ withFile = false }: { withFile?: boolean }) {
  const { importData } = useStore();
  const [status, setStatus] = useState<Status>(null);
  const [manual, setManual] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function importText(raw: string) {
    const data = await parseImport(raw);
    if (!data) {
      setStatus({ ok: false, text: "Kod okunamadı. Linkin tamamını kopyaladığından emin ol." });
      return;
    }
    const added = importData(data);
    setText("");
    setManual(false);
    setStatus({
      ok: true,
      text: added > 0 ? `${added} kayıt eklendi.` : "Bu kayıtlar zaten vardı, değişiklik yapılmadı.",
    });
  }

  async function handlePaste() {
    setStatus(null);
    const clip = await readClipboard();
    if (clip === null || !clip.trim()) {
      setManual(true);
      return;
    }
    await importText(clip);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus(null);
    await importText(await file.text());
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePaste}
          className="press min-h-12 flex-1 rounded-full bg-ink/5 text-[15px] font-semibold text-ink"
        >
          Kodu yapıştır
        </button>
        {withFile && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press min-h-12 flex-1 rounded-full bg-ink/5 text-[15px] font-semibold text-ink"
          >
            Dosyadan yükle
          </button>
        )}
      </div>
      {withFile && (
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json,text/plain"
          onChange={handleFile}
          className="hidden"
        />
      )}
      {manual && (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Linki buraya yapıştır"
            rows={3}
            spellCheck={false}
            className={`${INPUT_CLASS} min-h-24 py-3`}
          />
          <button
            type="button"
            onClick={() => importText(text)}
            disabled={!text.trim()}
            className="press min-h-12 rounded-full bg-ink text-[15px] font-semibold text-paper disabled:opacity-40"
          >
            Yükle
          </button>
        </div>
      )}
      {status && (
        <p className={`text-[13px] ${status.ok ? "text-ink-soft" : "text-iris"}`}>{status.text}</p>
      )}
    </div>
  );
}
