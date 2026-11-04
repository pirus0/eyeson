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
  AnyItem,
  Bill,
  CompletionMap,
  CreditCard,
  Importance,
  Installment,
  OneOff,
  RecurringTodo,
  StoreData,
  WeeklyTodo,
} from "./types";
import { emptyData, loadData, saveData } from "./storage";
import { mergeData } from "./backup";
import { clampToMonth, fromKey, toKey } from "./date";

const LIST_BY_KIND = {
  bill: "bills",
  installment: "installments",
  recurringTodo: "recurringTodos",
  weeklyTodo: "weeklyTodos",
  oneOff: "oneOffs",
  creditCard: "creditCards",
} as const;

function monthIndexOf(key: string): number {
  const d = fromKey(key);
  return d.getFullYear() * 12 + d.getMonth();
}

/** Moves every `${prefix}:${date}` completion to the date `newDateFor`
 * gives it (null = leave it). */
function remapCompletions(
  completions: CompletionMap,
  prefix: string,
  newDateFor: (oldDate: string) => string | null
): CompletionMap {
  let out: CompletionMap | null = null;
  for (const [key, value] of Object.entries(completions)) {
    if (!key.startsWith(prefix + ":")) continue;
    const oldDate = key.slice(prefix.length + 1);
    if (oldDate.includes(":")) continue; // a card's :statement/:due key under the bare id
    const newDate = newDateFor(oldDate);
    if (!newDate || newDate === oldDate) continue;
    out ??= { ...completions };
    delete out[key];
    out[`${prefix}:${newDate}`] = value;
  }
  return out ?? completions;
}

const sameMonthOnDay = (day: number) => (oldDate: string) => {
  const d = fromKey(oldDate);
  return toKey(clampToMonth(d.getFullYear(), d.getMonth(), day));
};

/** When an edit moves an item's day, its past ticks (and a card's entered
 * statement amounts) follow to the new day in the same month — otherwise
 * every already-paid month would resurface as overdue on the new date. */
function moveCompletions(prev: AnyItem, next: AnyItem, c: CompletionMap): CompletionMap {
  if (prev.kind === "bill" && next.kind === "bill" && prev.dayOfMonth !== next.dayOfMonth) {
    return remapCompletions(c, prev.id, sameMonthOnDay(next.dayOfMonth));
  }
  if (prev.kind === "installment" && next.kind === "installment" && prev.startDate !== next.startDate) {
    const shift = monthIndexOf(next.startDate) - monthIndexOf(prev.startDate);
    const day = fromKey(next.startDate).getDate();
    return remapCompletions(c, prev.id, (oldDate) => {
      const d = fromKey(oldDate);
      return toKey(clampToMonth(d.getFullYear(), d.getMonth() + shift, day));
    });
  }
  if (prev.kind === "creditCard" && next.kind === "creditCard") {
    if (prev.statementDay !== next.statementDay) {
      c = remapCompletions(c, `${prev.id}:statement`, sameMonthOnDay(next.statementDay));
    }
    if (prev.dueDay !== next.dueDay) {
      c = remapCompletions(c, `${prev.id}:due`, sameMonthOnDay(next.dueDay));
    }
    return c;
  }
  if (prev.kind === "oneOff" && next.kind === "oneOff" && prev.date && next.date && prev.date !== next.date) {
    return remapCompletions(c, prev.id, (oldDate) => (oldDate === prev.date ? next.date! : null));
  }
  return c;
}

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
  addWeeklyTodo: (input: { title: string; startDate: string; weekday: number }) => void;
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
  /** Replaces an item with its edited copy (same id and kind). */
  updateItem: (item: AnyItem) => void;
  /** `key` is an Occurrence's `key` (already accounts for daily vs weekly
   * completion grouping). `amount` is only used on a card's statement row. */
  setDone: (key: string, done: boolean, amount?: number) => void;
  /** Merges a backup / import link into what's here; returns how many
   * records were new. */
  importData: (incoming: StoreData) => number;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData());
  const [ready, setReady] = useState(false);

  // The hydration effect below also triggers the data-change effect (data
  // goes from the initial emptyData() to whatever loadData() returned). That
  // transition isn't an edit, so it isn't written back.
  const isHydratingRef = useRef(true);
  const latestDataRef = useRef(data);

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

  useEffect(() => {
    if (!ready) return;
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }
    saveData(data);
  }, [data, ready]);

  const importData = useCallback<StoreContextValue["importData"]>((incoming) => {
    const { merged, added } = mergeData(latestDataRef.current, incoming);
    latestDataRef.current = merged;
    setData(merged);
    return added;
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
      weekday: input.weekday,
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

  const updateItem = useCallback<StoreContextValue["updateItem"]>((item) => {
    setData((d) => {
      const listKey = LIST_BY_KIND[item.kind];
      const list = d[listKey] as AnyItem[];
      const prev = list.find((x) => x.id === item.id);
      if (!prev) return d;
      return {
        ...d,
        [listKey]: list.map((x) => (x.id === item.id ? item : x)),
        completions: moveCompletions(prev, item, d.completions),
      };
    });
  }, []);

  const setDone = useCallback<StoreContextValue["setDone"]>((key, done, amount) => {
    setData((d) => ({
      ...d,
      completions: {
        ...d.completions,
        [key]: {
          done,
          doneAt: done ? new Date().toISOString() : undefined,
          // Kept when unticking so the input comes back pre-filled.
          amount: amount ?? d.completions[key]?.amount,
        },
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
      updateItem,
      setDone,
      importData,
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
      updateItem,
      setDone,
      importData,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
