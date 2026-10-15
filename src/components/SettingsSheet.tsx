"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { CloudSyncIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";
import { ImportControls } from "./ImportControls";
import { shareBackup } from "@/lib/backup";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsSheet({ open, onOpenChange }: Props) {
  const { data } = useStore();
  const [shared, setShared] = useState(false);
  useBodyScrollLock(open);

  return (
    <>
      <IconButton onClick={() => onOpenChange(true)} ariaLabel="Yedekleme ayarları" className="text-ink">
        <CloudSyncIcon className="h-[22px] w-[22px]" />
      </IconButton>

      <Sheet open={open} onClose={() => onOpenChange(false)} title="Yedekleme">
            <div className="flex flex-col gap-2 pb-6">
              <p className="text-[14px] leading-relaxed text-ink-soft">
                Verilerin sadece bu telefonda saklanır. Tüm kayıtlarını tek bir dosya olarak
                kendine gönder (WhatsApp, Notlar, Dosyalar…). Telefon değişirse ya da
                uygulama silinirse bu dosyadan geri yüklenir.
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

            <div className="flex flex-col gap-2">
              <p className="text-[14px] leading-relaxed text-ink-soft">
                Yedekten ya da sana gönderilen bir yükleme linkinden kayıt ekle. Var olan
                kayıtların silinmez, aynı kayıt iki kez eklenmez.
              </p>
              <ImportControls withFile />
            </div>
      </Sheet>
    </>
  );
}
