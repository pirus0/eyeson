import type { Occurrence } from "@/lib/occurrences";
import { occurrenceImportance } from "@/lib/occurrences";
import type { CompletionMap } from "@/lib/types";

const IMPORTANCE_RANK: Record<string, number> = {
  yuksek: 0,
  orta: 1,
  dusuk: 2,
};

function importanceRank(occ: Occurrence): number {
  const importance = occurrenceImportance(occ);
  return importance ? IMPORTANCE_RANK[importance] : 2;
}

/** Moment the item should be considered "ticked" for ordering purposes: when
 * it was checked off if done, else when it was created — so ties don't
 * reshuffle on every toggle. */
function tickOrder(occ: Occurrence, completions: CompletionMap): string {
  if (occ.done) return completions[occ.key]?.doneAt ?? occ.item.createdAt;
  return occ.item.createdAt;
}

/** Three-level sort: not-done before done (a done item never stays up top
 * just because it's high-importance — it always sinks below every pending
 * item); within each of those groups, importance order (yüksek > orta >
 * düşük/none); within a matching importance tier, tick order. */
export function sortOccurrences(occs: Occurrence[], completions: CompletionMap): Occurrence[] {
  return [...occs].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ra = importanceRank(a);
    const rb = importanceRank(b);
    if (ra !== rb) return ra - rb;
    return tickOrder(a, completions).localeCompare(tickOrder(b, completions));
  });
}
