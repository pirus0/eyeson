"use client";

import { ImportControls } from "./ImportControls";

/** Shown only while there are no records at all — typically the first open
 * of a freshly installed app on an iPhone, right after the import link's
 * code was copied in Safari. */
export function EmptyImportCard() {
  return (
    <div className="mx-1 mb-3 flex flex-col gap-3 rounded-[28px] bg-surface p-5 shadow-[0_1px_0_var(--line)]">
      <p className="text-[15px] leading-relaxed text-ink-soft">
        Henüz kayıt yok. Sana bir yükleme linki gönderildiyse kopyalayıp buradan yapıştır.
      </p>
      <ImportControls />
    </div>
  );
}
