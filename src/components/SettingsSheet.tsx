"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { CloudSyncIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsSheet({ open, onOpenChange }: Props) {
  const { syncEnabled, syncState, syncError, lastSyncedAt, configureSync, disableSync } =
    useStore();
  const [tokenInput, setTokenInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useBodyScrollLock(open);

  async function handleSave() {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setSaving(true);
    setFormError(null);
    try {
      await configureSync(trimmed);
      setTokenInput("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <IconButton onClick={() => onOpenChange(true)} ariaLabel="Yedekleme ayarları" className="relative text-ink">
        <CloudSyncIcon className="h-5 w-5" />
        {syncEnabled && syncState === "error" && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-pen" />
        )}
      </IconButton>

      <Sheet open={open} onClose={() => onOpenChange(false)} title="Yedekleme" variant="box-alt">
            <p className="pb-3 text-sm text-ink-soft">
              Verilerin bu cihazda saklanır. İstersen private bir GitHub Gist&apos;e de
              yedeklenmesini sağlayabilirsin — uygulamayı silip yeniden kurarsan sadece
              buraya token&apos;ı tekrar yapıştırman yeterli olur, veriler geri gelir.
            </p>

            {syncEnabled ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-ink">
                  {syncState === "syncing"
                    ? "Senkronize ediliyor…"
                    : syncState === "error"
                      ? `Hata: ${syncError ?? "bilinmeyen bir sorun oluştu."}`
                      : lastSyncedAt
                        ? `Son senkron: ${new Date(lastSyncedAt).toLocaleString("tr-TR")}`
                        : "Yedekleme açık."}
                </p>
                <button
                  type="button"
                  onClick={disableSync}
                  className="sketch-box px-3 py-1.5 text-sm text-ink-soft"
                >
                  Yedeklemeyi kapat
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-xs text-ink-faint">
                  github.com/settings/tokens adresinden &quot;gist&quot; izinli klasik bir
                  Personal Access Token oluştur ve aşağıya yapıştır.
                </p>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_..."
                  autoComplete="off"
                  spellCheck={false}
                  className="sketch-box w-full bg-paper px-3 py-2 text-sm text-ink outline-none"
                />
                {formError && <p className="text-xs text-red-pen">{formError}</p>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !tokenInput.trim()}
                  className="sketch-box px-3 py-1.5 text-sm text-ink disabled:opacity-50"
                >
                  {saving ? "Bağlanıyor…" : "Kaydet"}
                </button>
              </div>
            )}
      </Sheet>
    </>
  );
}
