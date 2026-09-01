import type { StoreData } from "./types";

const TOKEN_KEY = "eyeson-gh-token";
const GIST_ID_KEY = "eyeson-gist-id";
const GIST_FILENAME = "eyeson-data.json";
// Used to relocate the backup gist by search when only the token survives
// (e.g. after the PWA is removed and reinstalled) — the cached id below is
// just a speed shortcut, never the only way to find it again.
const GIST_DESCRIPTION = "eyeson-backup (silme / yeniden adlandırma)";

export type SyncPayload = { updatedAt: number; data: StoreData };

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(GIST_ID_KEY);
}

function getCachedGistId(): string | null {
  return window.localStorage.getItem(GIST_ID_KEY);
}

function setCachedGistId(id: string): void {
  window.localStorage.setItem(GIST_ID_KEY, id);
}

async function githubFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...(init?.headers ?? {}),
    },
  });
}

function statusMessage(status: number): string {
  if (status === 401) return "Token geçersiz veya süresi dolmuş.";
  if (status === 403) return "Token'ın 'gist' izni yok gibi görünüyor.";
  return `GitHub'a bağlanılamadı (${status}).`;
}

/** Finds this app's existing backup gist by its marker description, trying
 * the cached id first (fast path on the device that created it) before
 * falling back to listing all of the account's gists — this is what lets a
 * fresh install recover data with nothing but the token, no id stored
 * anywhere durable. */
async function findGistId(token: string): Promise<string | null> {
  const cached = getCachedGistId();
  if (cached) {
    const res = await githubFetch(token, `/gists/${cached}`);
    if (res.ok) return cached;
    // Cached id stale/deleted on GitHub's side — fall through to search.
  }
  let page = 1;
  while (page <= 5) {
    const res = await githubFetch(token, `/gists?per_page=100&page=${page}`);
    if (!res.ok) throw new Error(statusMessage(res.status));
    const list = (await res.json()) as Array<{ id: string; description: string | null }>;
    const match = list.find((g) => g.description === GIST_DESCRIPTION);
    if (match) {
      setCachedGistId(match.id);
      return match.id;
    }
    if (list.length < 100) break;
    page += 1;
  }
  return null;
}

async function createGist(token: string, seed: SyncPayload): Promise<string> {
  const res = await githubFetch(token, "/gists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(seed) } },
    }),
  });
  if (!res.ok) throw new Error(statusMessage(res.status));
  const json = (await res.json()) as { id: string };
  setCachedGistId(json.id);
  return json.id;
}

/** Returns the backup gist's id, creating one seeded with `seed` if this
 * token has never set one up before. */
export async function ensureGistId(token: string, seed: SyncPayload): Promise<string> {
  const existing = await findGistId(token);
  if (existing) return existing;
  return createGist(token, seed);
}

/** Gist files over ~1MB come back with `truncated: true` and cut-off
 * `content` — the full body has to be re-fetched from `raw_url` instead. */
async function fetchRawContent(token: string, rawUrl: string): Promise<string> {
  const res = await fetch(rawUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(statusMessage(res.status));
  return res.text();
}

export async function pullPayload(token: string, gistId: string): Promise<SyncPayload | null> {
  const res = await githubFetch(token, `/gists/${gistId}`);
  if (!res.ok) throw new Error(statusMessage(res.status));
  const json = await res.json();
  const file = json.files?.[GIST_FILENAME];
  if (!file) return null;
  const content: string | undefined =
    file.truncated && file.raw_url ? await fetchRawContent(token, file.raw_url) : file.content;
  if (!content) return null;
  try {
    return JSON.parse(content) as SyncPayload;
  } catch {
    return null;
  }
}

export async function pushPayload(token: string, gistId: string, payload: SyncPayload): Promise<void> {
  const res = await githubFetch(token, `/gists/${gistId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(payload) } },
    }),
  });
  if (!res.ok) throw new Error(statusMessage(res.status));
}
