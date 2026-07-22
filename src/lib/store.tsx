"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Bill,
  Importance,
  Installment,
  OneOff,
  RecurringTodo,
  StoreData,
  WeeklyTodo,
} from "./types";
import { emptyData, loadData, saveData } from "./storage";

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
  addOneOff: (input: { title: string; date: string }) => void;
  removeItem: (
    kind: "bill" | "installment" | "recurringTodo" | "weeklyTodo" | "oneOff",
    id: string
  ) => void;
  toggleActive: (kind: "bill" | "recurringTodo" | "weeklyTodo", id: string) => void;
  /** `key` is an Occurrence's `key` (already accounts for daily vs weekly completion grouping). */
  setDone: (key: string, done: boolean) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage after mount, so the server-rendered
    // and first client render stay identical (no hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadData());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);

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
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, oneOffs: [...d.oneOffs, oneOff] }));
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
      }
    });
  }, []);

  const toggleActive = useCallback<StoreContextValue["toggleActive"]>((kind, id) => {
    setData((d) => {
      if (kind === "bill") {
        return {
          ...d,
          bills: d.bills.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
        };
      }
      if (kind === "weeklyTodo") {
        return {
          ...d,
          weeklyTodos: d.weeklyTodos.map((t) => (t.id === id ? { ...t, active: !t.active } : t)),
        };
      }
      return {
        ...d,
        recurringTodos: d.recurringTodos.map((t) =>
          t.id === id ? { ...t, active: !t.active } : t
        ),
      };
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
      removeItem,
      toggleActive,
      setDone,
    }),
    [
      data,
      ready,
      addBill,
      addInstallment,
      addRecurringTodo,
      addWeeklyTodo,
      addOneOff,
      removeItem,
      toggleActive,
      setDone,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
