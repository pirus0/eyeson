export type Importance = "yuksek" | "orta" | "dusuk";

export type Bill = {
  id: string;
  kind: "bill";
  name: string;
  amount?: number;
  dayOfMonth: number; // 1-31, clamped to the month's last day when short
  importance: Importance;
  createdAt: string;
  active: boolean;
};

export type Installment = {
  id: string;
  kind: "installment";
  name: string;
  amount: number;
  startDate: string; // YYYY-MM-DD, first installment's due date
  count: number; // total number of installments
  importance: Importance;
  createdAt: string;
};

export type RecurringTodo = {
  id: string;
  kind: "recurringTodo";
  title: string;
  startDate: string; // YYYY-MM-DD, repeats every day from here on
  createdAt: string;
  active: boolean;
};

export type OneOff = {
  id: string;
  kind: "oneOff";
  title: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
};

export type PaymentItem = Bill | Installment;
export type AnyItem = Bill | Installment | RecurringTodo | OneOff;

export type Completion = {
  done: boolean;
  doneAt?: string;
};

// key format: `${itemId}:${YYYY-MM-DD}`
export type CompletionMap = Record<string, Completion>;

export type StoreData = {
  bills: Bill[];
  installments: Installment[];
  recurringTodos: RecurringTodo[];
  oneOffs: OneOff[];
  completions: CompletionMap;
};

export function completionKey(itemId: string, date: string): string {
  return `${itemId}:${date}`;
}

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

export const IMPORTANCE_THRESHOLD_DAYS: Record<Importance, number> = {
  yuksek: 7,
  orta: 3,
  dusuk: 1,
};
