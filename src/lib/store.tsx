"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Bill,
  CreditCard,
  Importance,
  Installment,
  OneOff,
  RecurringTodo,
  StoreData,
  WeeklyTodo,
} from "./types";
import { emptyData, getLocalUpdatedAt, loadData, saveData } from "./storage";
import {
  clearToken,
  ensureGistId,
  getToken,
  pullPayload,
  pushPayload,
  setToken as persistToken,
  type SyncPayload,
} from "./sync";

/** Debounces pushes so a burst of edits (typing, several checkbox taps)
 * becomes one API call instead of one per keystroke. */
const PUSH_DEBOUNCE_MS = 2000;

export type SyncState = "idle" | "syncing" | "error";

function makeId(): string {
  return crypto.randomUUID();
}

type StoreContextValue = {
  data: StoreData;
  ready: boolean;
  addBill: (input: {
    name: string;
    amount?: number;
    dayOfMonth: number;
    importance: Importance;
  }) => void;
  addInstallment: (input: {
    name: string;
    amount: number;
    startDate: string;
    count: number;
    importance: Importance;
  }) => void;
  addRecurringTodo: (input: { title: string; startDate: string }) => void;
  addWeeklyTodo: (input: { title: string; startDate: string }) => void;
  addOneOff: (input: { title: string; date?: string; importance?: Importance }) => void;
  /** Gives an unscheduled one-off (created with no date) a day and, optionally,
   * an importance — after this it behaves exactly like one created with a date
   * up front. */
  assignOneOff: (id: string, input: { date: string; importance?: Importance }) => void;
  addCreditCard: (input: {
    name: string;
    amount?: number;
    statementDay: number;
    dueDay: number;
    importance: Importance;
  }) => void;
  removeItem: (
    kind: "bill" | "installment" | "recurringTodo" | "weeklyTodo" | "oneOff" | "creditCard",
    id: string
  ) => void;
  /** `key` is an Occurrence's `key` (already accounts for daily vs weekly completion grouping). */
  setDone: (key: string, done: boolean) => void;
  syncEnabled: boolean;
  syncState: SyncState;
  syncError: string | null;
  lastSyncedAt: number | null;
  /** Verifies the token by using it, seeds/finds the backup gist, and pulls
   * whatever's already there. Throws (surfaced to the settings form) only if
   * the very first contact with GitHub fails outright; once enabled, later
   * failures are reported through syncState/syncError instead. */
  configureSync: (token: string) => Promise<void>;
  disableSync: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData());
  const [ready, setReady] = useState(false);

  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Gist id lives in a ref (not state): it's an implementation detail the UI
  // never needs to render, and pushes need to read it synchronously from
  // inside a debounce timer.
  const gistIdRef = useRef<string | null>(null);
  const latestDataRef = useRef(data);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Applying a pulled payload triggers the same data-change effect that user
  // edits do; this skips the one push that would otherwise immediately echo
  // back what was just downloaded.
  const skipNextPushRef = useRef(false);
  // The hydration effect below also triggers the data-change effect (data
  // goes from the initial emptyData() to whatever loadData() returned). That
  // transition isn't an edit — it must not bump eyeson-data-updated-at,
  // otherwise a device with no local data looks "just updated" and always
  // outranks a genuinely newer pulled backup, so the backup never applies.
  const isHydratingRef = useRef(true);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    // One-time hydration from localStorage after mount, so the server-rendered
    // and first client render stay identical (no hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadData());
    setReady(true);
  }, []);

  const pullAndApply = useCallback(async (token: string, opts?: { throwOnError?: boolean }) => {
    setSyncState("syncing");
    try {
      const seed: SyncPayload = { updatedAt: getLocalUpdatedAt(), data: latestDataRef.current };
      const gistId = await ensureGistId(token, seed);
      const remote = await pullPayload(token, gistId);
      // Only remembered once the pull itself succeeded: if pullPayload throws,
      // leaving this unset means the next reconnect retries the pull instead of
      // schedulePush() silently overwriting the remote backup with stale data.
      gistIdRef.current = gistId;
      if (remote && remote.updatedAt > getLocalUpdatedAt()) {
        skipNextPushRef.current = true;
        setData(remote.data);
      }
      setSyncState("idle");
      setSyncError(null);
      setLastSyncedAt(Date.now());
    } catch (err) {
      setSyncState("error");
      setSyncError(err instanceof Error ? err.message : "Senkronizasyon başarısız.");
      if (opts?.throwOnError) throw err;
    }
  }, []);

  const schedulePush = useCallback(() => {
    if (!getToken() || !gistIdRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      pushTimerRef.current = null;
      const token = getToken();
      const gistId = gistIdRef.current;
      if (!token || !gistId) return;
      try {
        setSyncState("syncing");
        await pushPayload(token, gistId, { updatedAt: Date.now(), data: latestDataRef.current });
        setSyncState("idle");
        setSyncError(null);
        setLastSyncedAt(Date.now());
      } catch (err) {
        setSyncState("error");
        setSyncError(err instanceof Error ? err.message : "Yedekleme başarısız.");
      }
    }, PUSH_DEBOUNCE_MS);
  }, []);

  // On mount, pick up a token saved on a previous visit and pull whatever's
  // already backed up (e.g. after this device's localStorage was wiped by a
  // PWA reinstall).
  useEffect(() => {
    if (!ready) return;
    const token = getToken();
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncEnabled(true);
    pullAndApply(token);
    // Only ever runs once, right after hydration finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // A push attempted while offline is simply dropped by fetch; retry once
  // connectivity returns instead of leaving it stuck in "error" until the
  // next edit happens to schedule a new push.
  useEffect(() => {
    function handleOnline() {
      const token = getToken();
      if (!token) return;
      if (!gistIdRef.current) pullAndApply(token);
      else schedulePush();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [pullAndApply, schedulePush]);

  useEffect(() => {
    if (!ready) return;
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }
    saveData(data);
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    schedulePush();
  }, [data, ready, schedulePush]);

  useEffect(() => {
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, []);

  const configureSync = useCallback<StoreContextValue["configureSync"]>(
    async (token) => {
      // Verify before persisting/enabling anything, so an invalid token is
      // rejected back to the settings form instead of being saved as if it
      // worked (pullAndApply itself never rethrows on later, post-enable calls).
      await pullAndApply(token, { throwOnError: true });
      persistToken(token);
      setSyncEnabled(true);
    },
    [pullAndApply]
  );

  const disableSync = useCallback<StoreContextValue["disableSync"]>(() => {
    clearToken();
    gistIdRef.current = null;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    setSyncEnabled(false);
    setSyncState("idle");
    setSyncError(null);
    setLastSyncedAt(null);
  }, []);

  const addBill = useCallback<StoreContextValue["addBill"]>((input) => {
    const bill: Bill = {
      id: makeId(),
      kind: "bill",
      name: input.name,
      amount: input.amount,
      dayOfMonth: input.dayOfMonth,
      importance: input.importance,
      createdAt: new Date().toISOString(),
      active: true,
    };
    setData((d) => ({ ...d, bills: [...d.bills, bill] }));
  }, []);

  const addInstallment = useCallback<StoreContextValue["addInstallment"]>((input) => {
    const installment: Installment = {
      id: makeId(),
      kind: "installment",
      name: input.name,
      amount: input.amount,
      startDate: input.startDate,
      count: input.count,
      importance: input.importance,
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, installments: [...d.installments, installment] }));
  }, []);

  const addRecurringTodo = useCallback<StoreContextValue["addRecurringTodo"]>((input) => {
    const todo: RecurringTodo = {
      id: makeId(),
      kind: "recurringTodo",
      title: input.title,
      startDate: input.startDate,
      createdAt: new Date().toISOString(),
      active: true,
    };
    setData((d) => ({ ...d, recurringTodos: [...d.recurringTodos, todo] }));
  }, []);

  const addWeeklyTodo = useCallback<StoreContextValue["addWeeklyTodo"]>((input) => {
    const todo: WeeklyTodo = {
      id: makeId(),
      kind: "weeklyTodo",
      title: input.title,
      startDate: input.startDate,
      createdAt: new Date().toISOString(),
      active: true,
    };
    setData((d) => ({ ...d, weeklyTodos: [...d.weeklyTodos, todo] }));
  }, []);

  const addOneOff = useCallback<StoreContextValue["addOneOff"]>((input) => {
    const oneOff: OneOff = {
      id: makeId(),
      kind: "oneOff",
      title: input.title,
      date: input.date,
      importance: input.importance,
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, oneOffs: [...d.oneOffs, oneOff] }));
  }, []);

  const assignOneOff = useCallback<StoreContextValue["assignOneOff"]>((id, input) => {
    setData((d) => ({
      ...d,
      oneOffs: d.oneOffs.map((o) =>
        o.id === id ? { ...o, date: input.date, importance: input.importance } : o
      ),
    }));
  }, []);

  const addCreditCard = useCallback<StoreContextValue["addCreditCard"]>((input) => {
    const card: CreditCard = {
      id: makeId(),
      kind: "creditCard",
      name: input.name,
      amount: input.amount,
      statementDay: input.statementDay,
      dueDay: input.dueDay,
      importance: input.importance,
      createdAt: new Date().toISOString(),
      active: true,
    };
    setData((d) => ({ ...d, creditCards: [...d.creditCards, card] }));
  }, []);

  const removeItem = useCallback<StoreContextValue["removeItem"]>((kind, id) => {
    setData((d) => {
      switch (kind) {
        case "bill":
          return { ...d, bills: d.bills.filter((x) => x.id !== id) };
        case "installment":
          return { ...d, installments: d.installments.filter((x) => x.id !== id) };
        case "recurringTodo":
          return { ...d, recurringTodos: d.recurringTodos.filter((x) => x.id !== id) };
        case "weeklyTodo":
          return { ...d, weeklyTodos: d.weeklyTodos.filter((x) => x.id !== id) };
        case "oneOff":
          return { ...d, oneOffs: d.oneOffs.filter((x) => x.id !== id) };
        case "creditCard":
          return { ...d, creditCards: d.creditCards.filter((x) => x.id !== id) };
      }
    });
  }, []);

  const setDone = useCallback<StoreContextValue["setDone"]>((key, done) => {
    setData((d) => ({
      ...d,
      completions: {
        ...d.completions,
        [key]: { done, doneAt: done ? new Date().toISOString() : undefined },
      },
    }));
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      data,
      ready,
      addBill,
      addInstallment,
      addRecurringTodo,
      addWeeklyTodo,
      addOneOff,
      assignOneOff,
      addCreditCard,
      removeItem,
      setDone,
      syncEnabled,
      syncState,
      syncError,
      lastSyncedAt,
      configureSync,
      disableSync,
    }),
    [
      data,
      ready,
      addBill,
      addInstallment,
      addRecurringTodo,
      addWeeklyTodo,
      addOneOff,
      assignOneOff,
      addCreditCard,
      removeItem,
      setDone,
      syncEnabled,
      syncState,
      syncError,
      lastSyncedAt,
      configureSync,
      disableSync,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
