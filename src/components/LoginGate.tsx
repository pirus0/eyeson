"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { ACCOUNT_EMAIL, auth } from "@/lib/firebase";
import { BrandEye } from "./Icons";

const LOCK_KEY = "eyeson-giris-kilit";

type Lock = { fails: number; until: number };

function readLock(): Lock {
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (raw) return JSON.parse(raw) as Lock;
  } catch {}
  return { fails: 0, until: 0 };
}

function writeLock(lock: Lock) {
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  } catch {}
}

/** 3 wrong tries are free, then 30s, 1m, 2m … up to 15m. */
function lockAfter(fails: number): number {
  if (fails < 3) return 0;
  return Math.min(30_000 * 2 ** (fails - 3), 15 * 60_000);
}

export function LoginGate({ children }: { children: React.ReactNode }) {
  // undefined = still asking Firebase whether this device is signed in.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <div className="min-h-dvh bg-paper" />;
  if (!user) return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [lock, setLock] = useState<Lock>({ fails: 0, until: 0 });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLock(readLock());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const waitSec = Math.max(0, Math.ceil((lock.until - now) / 1000));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || waitSec > 0 || !password) return;
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, ACCOUNT_EMAIL, password);
      writeLock({ fails: 0, until: 0 });
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      if (code === "auth/network-request-failed") {
        setError("Bağlantı yok");
      } else if (code === "auth/too-many-requests") {
        const next = { fails: lock.fails, until: Date.now() + 5 * 60_000 };
        writeLock(next);
        setLock(next);
        setError("Çok fazla deneme");
      } else {
        const fails = lock.fails + 1;
        const next = { fails, until: Date.now() + lockAfter(fails) };
        writeLock(next);
        setLock(next);
        setError("Şifre yanlış");
      }
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-6">
      <form onSubmit={submit} className="flex w-full max-w-[340px] flex-col items-center gap-4">
        <BrandEye className="h-12 w-12 text-ink" />
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
          aria-label="Şifre"
          className="min-h-12 w-full rounded-full bg-surface px-5 text-[16px] text-ink outline-none shadow-[0_1px_0_var(--line)] placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={busy || waitSec > 0 || !password}
          className="press min-h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-paper disabled:opacity-40"
        >
          {waitSec > 0 ? `${waitSec} sn` : "Giriş"}
        </button>
        <p className="min-h-5 text-[13px] text-iris" role="alert">
          {error}
        </p>
      </form>
    </main>
  );
}
