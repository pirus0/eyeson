// Must mirror `basePath` in next.config.ts: Next.js only auto-prefixes
// framework-aware links (next/link, next/image), not literal string URLs
// written by hand (manifest icon paths, the service-worker registration).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
