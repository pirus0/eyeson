"use client";

import { deleteField, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { withBasePath } from "./basePath";

/** Public half of the Web Push (VAPID) key pair. The private half lives only
 * in the GitHub Actions secret the morning job signs with. */
export const VAPID_PUBLIC_KEY =
  "BAMfFiP6cdSayIFJTAPAPcS9BYX9E7WLIvwUZVHa5uY9u5WIrVSCTFGZfGyO8szZ8_OFSc6nFV3HLOGs7Rjln-8";

/** One field per device: { <endpoint id>: { json, at } }. */
export const pushDoc = doc(db, "veri", "bildirim");

export type PushState = "unsupported" | "needsHomeScreen" | "denied" | "off" | "on";

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Short, Firestore-safe field name derived from the push endpoint. */
async function endpointId(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(withBasePath("/"));
  return existing ?? navigator.serviceWorker.register(withBasePath("/sw.js"));
}

async function save(sub: PushSubscription): Promise<void> {
  const id = await endpointId(sub.endpoint);
  await setDoc(
    pushDoc,
    { [id]: { json: JSON.stringify(sub.toJSON()), at: new Date().toISOString() } },
    { merge: true }
  );
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return isIOS() && !standalone() ? "needsHomeScreen" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration(withBasePath("/"));
  const sub = await reg?.pushManager.getSubscription();
  if (!sub || Notification.permission !== "granted") return "off";
  // Re-save on every check: keeps the stored copy current if the browser
  // rotated the subscription, and restores it if the field was pruned.
  void save(sub).catch(() => {});
  return "on";
}

/** Must be called from a tap — iOS only shows the permission prompt then. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return pushState();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }));
  await save(sub);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration(withBasePath("/"));
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const id = await endpointId(sub.endpoint);
    await sub.unsubscribe();
    await setDoc(pushDoc, { [id]: deleteField() }, { merge: true });
  }
  return "off";
}

/** Home-screen icon count, kept in step with the bell while the app is open. */
export function setBadge(count: number): void {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) void nav.setAppBadge?.(count).catch(() => {});
    else void nav.clearAppBadge?.().catch(() => {});
  } catch {
    // Badging isn't available everywhere; the bell still shows the count.
  }
}
