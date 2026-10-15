"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  LINK_MARKER,
  countItems,
  isIOS,
  isStandalone,
  itemNames,
  parseImport,
} from "@/lib/backup";
import type { StoreData } from "@/lib/types";
import { Sheet } from "./Sheet";

type State =
  | null
  | { mode: "broken" }
  | { mode: "install"; link: string; data: StoreData }
  | { mode: "confirm"; data: StoreData }
  | { mode: "done"; added: number };

const SHOWN_NAMES = 6;

/** Handles opening an import link (`…/eyeson/#yukle=…`). On Android the
 * browser and the installed app share storage, so it just asks and loads.
 * On an iPhone, Safari and the home-screen app keep separate storage: loading
 * here would land in Safari only, so it first walks through installing and
 * hands over the link to paste inside the installed app. */
export function ImportFromLink() {
  const { importData } = useStore();
  const [state, setState] = useState<State>(null);
  const [copied, setCopied] = useState(false);
  useBodyScrollLock(state !== null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith(`#${LINK_MARKER}`)) return;
    const link = window.location.href;
    // Drop the code from the address bar so a refresh doesn't ask again and
    // "Ana Ekrana Ekle" installs the plain app address.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    parseImport(hash).then((data) => {
      if (!data || countItems(data) === 0) setState({ mode: "broken" });
      else if (isIOS() && !isStandalone()) setState({ mode: "install", link, data });
      else setState({ mode: "confirm", data });
    });
  }, []);

  const close = () => setState(null);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const title =
    state?.mode === "install"
      ? "Önce ana ekrana ekle"
      : state?.mode === "broken"
        ? "Link açılamadı"
        : "Kayıtları yükle";

  return (
    <Sheet open={state !== null} onClose={close} title={title}>
      {state?.mode === "broken" && (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Bu link eksik ya da bozuk görünüyor. Linki gönderen kişiden tekrar göndermesini iste.
          </p>
          <button
            type="button"
            onClick={close}
            className="press min-h-12 rounded-full bg-ink text-[15px] font-semibold text-paper"
          >
            Tamam
          </button>
        </div>
      )}

      {state?.mode === "install" && (
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink">
            <li className="flex gap-3">
              <span className="font-display font-bold text-iris">1</span>
              <span>Aşağıdaki &quot;Kodu kopyala&quot; düğmesine dokun.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display font-bold text-iris">2</span>
              <span>
                Alttaki paylaş simgesine (kutudan çıkan ok) dokun, &quot;Ana Ekrana Ekle&quot;yi seç.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display font-bold text-iris">3</span>
              <span>
                Ana ekrandaki Eyes On&apos;u aç ve &quot;Kodu yapıştır&quot;a dokun.{" "}
                {countItems(state.data)} kayıt yüklenecek.
              </span>
            </li>
          </ol>
          <button
            type="button"
            onClick={() => copyLink(state.link)}
            className="press min-h-12 rounded-full bg-ink text-[15px] font-semibold text-paper"
          >
            {copied ? "Kopyalandı" : "Kodu kopyala"}
          </button>
          <button
            type="button"
            onClick={() => setState({ mode: "confirm", data: state.data })}
            className="press min-h-11 text-[14px] text-ink-faint"
          >
            Ana ekrana eklemeden Safari&apos;de kullanacağım
          </button>
        </div>
      )}

      {state?.mode === "confirm" && (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-ink-soft">{countItems(state.data)} kayıt bulundu:</p>
          <ul className="flex flex-col gap-1.5 text-[15px] text-ink">
            {itemNames(state.data)
              .slice(0, SHOWN_NAMES)
              .map((name, i) => (
                <li key={i} className="truncate">
                  {name}
                </li>
              ))}
            {itemNames(state.data).length > SHOWN_NAMES && (
              <li className="text-ink-faint">
                ve {itemNames(state.data).length - SHOWN_NAMES} tane daha
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => setState({ mode: "done", added: importData(state.data) })}
            className="press min-h-12 rounded-full bg-ink text-[15px] font-semibold text-paper"
          >
            Yükle
          </button>
          <button type="button" onClick={close} className="press min-h-11 text-[14px] text-ink-faint">
            Vazgeç
          </button>
        </div>
      )}

      {state?.mode === "done" && (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-relaxed text-ink">
            {state.added > 0
              ? `${state.added} kayıt yüklendi.`
              : "Bu kayıtlar zaten vardı, değişiklik yapılmadı."}
          </p>
          <button
            type="button"
            onClick={close}
            className="press min-h-12 rounded-full bg-ink text-[15px] font-semibold text-paper"
          >
            Tamam
          </button>
        </div>
      )}
    </Sheet>
  );
}
