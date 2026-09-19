// Client-side TMDB client for Pure SPA.
// Browse layer for instant, paginated discovery.

const BASE = "https://api.themoviedb.org/3";

// Récupération des clés côté client
const TMDB_BEARER = process.env.NEXT_PUBLIC_TMDB_BEARER || "";
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "7b311a6f43090b24f188272bcc0655b3";

export function tmdbEnabled(): boolean {
  return !!(TMDB_BEARER || TMDB_API_KEY);
}

export async function tmdb<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  if (!TMDB_BEARER && !TMDB_API_KEY) throw new Error("TMDB not configured");

  const url = new URL(`${BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  if (TMDB_API_KEY && !TMDB_BEARER) url.searchParams.set("api_key", TMDB_API_KEY);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(TMDB_BEARER ? { Authorization: `Bearer ${TMDB_BEARER}` } : {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json() as Promise<T>;
}

/** Allow-list of TMDB paths the client may call. */
export function isAllowedPath(path: string): boolean {
  return /^(trending|movie|tv|discover|search|genre|person)\//.test(path) || path === "configuration";
}
