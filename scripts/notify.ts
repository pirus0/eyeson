// Morning reminder: reads the account's data from Firestore, runs the exact
// rule the bell uses (computeReminders) and pushes one notification to every
// device that turned notifications on. Run by .github/workflows/notify.yml.
//
// Env: FIREBASE_SERVICE_ACCOUNT (JSON), VAPID_PRIVATE_KEY, TZ=Europe/Istanbul.
// `--dry` prints the message without sending.

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";
import { computeReminders, type Reminder } from "../src/lib/occurrences";
import { withDefaults } from "../src/lib/storage";
import { itemTitle } from "../src/lib/itemMeta";
import type { StoreData } from "../src/lib/types";

const VAPID_PUBLIC_KEY =
  "BAMfFiP6cdSayIFJTAPAPcS9BYX9E7WLIvwUZVHa5uY9u5WIrVSCTFGZfGyO8szZ8_OFSc6nFV3HLOGs7Rjln-8";
const dry = process.argv.includes("--dry");

function status(r: Reminder): string {
  if (r.overdue) return `${Math.abs(r.daysUntilDue)} gün gecikti`;
  if (r.daysUntilDue === 0) return "bugün";
  if (r.daysUntilDue === 1) return "yarın";
  return `${r.daysUntilDue} gün kaldı`;
}

export function message(reminders: Reminder[]): { title: string; body: string; count: number } | null {
  if (!reminders.length) return null;
  const overdue = reminders.filter((r) => r.overdue).length;
  const upcoming = reminders.length - overdue;
  const title = [overdue && `${overdue} gecikmiş`, upcoming && `${upcoming} yaklaşan`]
    .filter(Boolean)
    .join(" · ");
  const lines = reminders.slice(0, 4).map((r) => `${itemTitle(r.item)} — ${status(r)}`);
  if (reminders.length > 4) lines.push(`+${reminders.length - 4} daha`);
  return { title, body: lines.join("\n"), count: reminders.length };
}

async function main() {
  const account = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT yok");
  initializeApp({ credential: cert(JSON.parse(account)) });
  const db = getFirestore();

  const dataSnap = await db.doc("veri/ana").get();
  const json = dataSnap.get("json");
  if (typeof json !== "string") {
    console.log("Veri belgesi boş, bildirim yok.");
    return;
  }
  const data: StoreData = withDefaults(JSON.parse(json));
  const reminders = computeReminders(data, data.completions, new Date());
  const msg = message(reminders);
  if (!msg) {
    console.log("Hatırlatılacak kayıt yok.");
    return;
  }
  console.log(`${msg.title}\n${msg.body}`);
  if (dry) return;

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) throw new Error("VAPID_PRIVATE_KEY yok");
  webpush.setVapidDetails("https://pirus0.github.io/eyeson/", VAPID_PUBLIC_KEY, privateKey);

  const subsRef = db.doc("veri/bildirim");
  const subs = (await subsRef.get()).data() ?? {};
  const ids = Object.keys(subs);
  if (!ids.length) {
    console.log("Bildirimi açık cihaz yok.");
    return;
  }

  let sent = 0;
  const gone: string[] = [];
  for (const id of ids) {
    try {
      const sub = JSON.parse(subs[id].json);
      await webpush.sendNotification(sub, JSON.stringify(msg), { TTL: 12 * 60 * 60, urgency: "normal" });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      // 404/410: the device dropped the subscription (app removed, permission
      // revoked) — forget it so it isn't retried every morning.
      if (code === 404 || code === 410) gone.push(id);
      else console.error(`Gönderilemedi (${id}):`, code ?? err);
    }
  }
  if (gone.length) {
    await subsRef.update(Object.fromEntries(gone.map((id) => [id, FieldValue.delete()])));
  }
  console.log(`Gönderildi: ${sent}, silinen eski cihaz: ${gone.length}`);
  if (!sent && ids.length > gone.length) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("notify.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
