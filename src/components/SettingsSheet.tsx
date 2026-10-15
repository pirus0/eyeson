"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { CloudSyncIcon } from "./Icons";
import { INPUT_CLASS } from "@/lib/itemMeta";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";
import { shareBackup } from "@/lib/backup";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsSheet({ open, onOpenChange }: Props) {
  const { data, syncEnabled, syncState, syncError, lastSyncedAt, configureSync, disableSync } =
    useStore();
  const [shared, setShared] = useState(false);
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
      <IconButton onClick={() => onOpenChange(true)} ariaLabel="Yedekleme ayarları" className="text-ink">
        <CloudSyncIcon className="h-[22px] w-[22px]" />
        {syncEnabled && syncState === "error" && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-iris" />
        )}
      </IconButton>

      <Sheet open={open} onClose={() => onOpenChange(false)} title="Yedekleme">
            <div className="flex flex-col gap-2 pb-6">
              <p className="text-[14px] leading-relaxed text-ink-soft">
                Tüm kayıtlarını tek bir dosya olarak kendine gönder (WhatsApp, Notlar,
                Dosyalar…). Telefon değişirse ya da uygulama silinirse bu dosyadan geri
                yüklenir.
              </p>
              <button
                type="button"
                onClick={async () => setShared(await shareBackup(data))}
                className="press min-h-12 rounded-full bg-ink text-[15px] font-semibold text-paper"
              >
                Yedeği paylaş
              </button>
              {shared && <p className="text-[12px] text-ink-faint">Yedek dosyası hazırlandı.</p>}
            </div>

            <p className="pb-4 text-[14px] leading-relaxed text-ink-soft">
              Verilerin bu cihazda saklanır. İstersen private bir GitHub Gist&apos;e de
              yedeklenmesini sağlayabilirsin — uygulamayı silip yeniden kurarsan sadece
              buraya token&apos;ı tekrar yapıştırman yeterli olur, veriler geri gelir.
            </p>

            {syncEnabled ? (
              <div className="flex flex-col items-start gap-2">
                <p className="flex items-center gap-2 text-[14px] text-ink">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      syncState === "error" ? "bg-iris" : syncState === "syncing" ? "animate-pulse bg-amber" : "bg-[#3f9a5c]"
                    }`}
                  />
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
                  className="press mt-1 min-h-11 rounded-full bg-ink/5 px-4 text-[14px] font-medium text-ink-soft"
                >
                  Yedeklemeyi kapat
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] text-ink-faint">
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
                  className={INPUT_CLASS}
                />
                {formError && <p className="text-[12px] text-iris">{formError}</p>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !tokenInput.trim()}
                  className="press min-h-12 rounded-full bg-ink text-[15px] font-semibold text-paper disabled:opacity-40"
                >
                  {saving ? "Bağlanıyor…" : "Kaydet"}
                </button>
              </div>
            )}
      </Sheet>
    </>
  );
}
