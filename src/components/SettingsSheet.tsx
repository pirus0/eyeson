"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { CloudSyncIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";
import { ImportControls } from "./ImportControls";
import { shareBackup } from "@/lib/backup";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
                Kayıtların hesabında saklanır, telefon ve bilgisayarda aynıdır. İstersen
                ayrıca tek bir dosya olarak kendine gönder.
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

            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="press mt-6 min-h-12 w-full rounded-full bg-surface-2 text-[15px] font-semibold text-ink"
            >
              Çıkış
            </button>
      </Sheet>
    </>
  );
}
