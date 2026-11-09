// Behaviour checks that gate deploys (see .github/workflows/deploy.yml).
import test from "node:test";
import assert from "node:assert/strict";
import { parseImport, mergeData } from "../src/lib/backup";
import { computeOverdue } from "../src/lib/occurrences";
import { emptyData, loadData } from "../src/lib/storage";
import type { StoreData } from "../src/lib/types";

const stamp = "2026-01-01T10:00:00.000Z";
const today = new Date(2026, 10, 9);
const data = (patch: Partial<StoreData>): StoreData => ({ ...emptyData(), ...patch });

test("içe aktarma: hesaplamanın okuduğu alanı eksik kayıt alınmaz", async () => {
  const file = { app: "eyeson", version: 1, data: { ...emptyData(),
    bills: [
      { id: "b1", kind: "bill", name: "Eksik", createdAt: stamp, active: true },
      { id: "b2", kind: "bill", name: "Tam", dayOfMonth: 5, importance: "orta", createdAt: stamp, active: true },
    ] } };
  const parsed = await parseImport(JSON.stringify(file));
  assert.deepEqual(parsed?.bills.map((b) => b.id), ["b2"]);
});

test("içe aktarma: eski yedekteki isteğe bağlı alanların eksikliği reddedilmez", async () => {
  const file = { ...emptyData(), oneOffs: [{ id: "o1", kind: "oneOff", title: "Tarihsiz", createdAt: stamp }] };
  assert.equal((await parseImport(JSON.stringify(file)))?.oneOffs.length, 1);
});

test("içe aktarma: dosya içinde tekrar eden kimlik tek kez eklenir", async () => {
  const one = { id: "o1", kind: "oneOff", title: "İkiz", date: "2026-11-09", createdAt: stamp };
  const parsed = await parseImport(JSON.stringify({ ...emptyData(), oneOffs: [one, one] }));
  assert.equal(parsed?.oneOffs.length, 1);
  const { merged, added } = mergeData(emptyData(), { ...emptyData(), oneOffs: [one, one] as StoreData["oneOffs"] });
  assert.equal(added, 1); assert.equal(merged.oneOffs.length, 1);
});

test("gecikmiş: yapılmayan görev yıllar sonra da gelir", () => {
  const d = data({ oneOffs: [{ id: "x", kind: "oneOff", title: "Eski", date: "2024-10-01", importance: "orta", createdAt: stamp }] });
  assert.deepEqual(computeOverdue(d, d.completions, today).map((o) => o.item.id), ["x"]);
});

test("gecikmiş: dün yapılmayan günlük görev tek satır gelir, yapılan gelmez", () => {
  const todo = (id: string) => ({ id, kind: "recurringTodo" as const, title: id, startDate: "2026-10-01", createdAt: stamp, active: true });
  const d = data({ recurringTodos: [todo("kacan"), todo("yapilan")], completions: { "yapilan:2026-11-08": { done: true, doneAt: stamp } } });
  const rows = computeOverdue(d, d.completions, today);
  assert.deepEqual(rows.map((o) => o.key), ["kacan:2026-11-08"]);
});

test("kayıt: okunamayan veri ayrı anahtara saklanır", () => {
  const store = new Map<string, string>([["eyeson-data-v1", '{"bills":[{bozuk']]);
  const localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  (globalThis as { window?: unknown }).window = { localStorage };
  try {
    assert.deepEqual(loadData(), emptyData());
    assert.ok([...store.keys()].some((k) => k.startsWith("eyeson-data-v1-bozuk-")));
  } finally { delete (globalThis as { window?: unknown }).window; }
});
