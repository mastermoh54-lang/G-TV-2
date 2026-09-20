// Client-side fetchers — dynamic routing between Cloudflare SPA, Vercel (Live) and Railway (VOD/Xtream)
import type {
  AuthResponse,
  Category,
  LiveStream,
  VodStream,
  VodInfo,
  Series,
  SeriesInfo,
  EpgListing,
  StreamKind,
} from "./xtream/types";

// Dynamic domain resolution for back-ends
const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || "";
const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_LIVE_URL || "https://g-tv-2.vercel.app";

/**
 * Détermine le serveur cible selon le type de requête :
 * - Live / Auth / EPG -> Vercel (https://g-tv-2.vercel.app)
 * - VOD / Séries / Catalogue -> Railway (NEXT_PUBLIC_RAILWAY_URL)
 */
function getTargetBaseUrl(path: string): string {
  if (typeof window === "undefined") return "";

  const isCloudflare =
    window.location.hostname.includes("workers.dev") ||
    window.location.hostname.includes("pages.dev");

  if (!isCloudflare) return "";

  // Aiguillage Vercel vs Railway
  if (path.includes("/api/auth") || path.includes("get_live") || path.includes("/api/epg")) {
    return VERCEL_URL;
  }

  return RAILWAY_URL;
}

async function getJson<T>(url: string): Promise<T> {
  const baseUrl = getTargetBaseUrl(url);
  const targetUrl = baseUrl ? `${baseUrl}${url}` : url;

  // CORRECTION ICI : "include" au lieu de "same-origin"
  const res = await fetch(targetUrl, { credentials: "include" });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

const x = (action: string, params: Record<string, string | number | undefined> = {}) => {
  const sp = new URLSearchParams({ action });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  return `/api/xtream?${sp.toString()}`;
};

export const api = {
  // auth
  session: () =>
    getJson<{
      authenticated: boolean;
      baseUrl?: string;
      username?: string;
      user_info?: AuthResponse["user_info"];
      server_info?: AuthResponse["server_info"];
    }>("/api/auth"),

  login: async (baseUrl: string, username: string, password: string) => {
    const route = "/api/auth";
    const targetUrl = `${getTargetBaseUrl(route)}${route}`;

    // CORRECTION ICI : "include"
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, username, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Login failed");
    return data as { ok: true; user_info: AuthResponse["user_info"]; server_info: AuthResponse["server_info"] };
  },

  logout: async () => {
    const route = "/api/auth";
    const targetUrl = `${getTargetBaseUrl(route)}${route}`;

    try {
      // CORRECTION ICI : "include"
      await fetch(targetUrl, { method: "DELETE", credentials: "include" });
    } catch {}

    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/login";
    }
  },

  // catalog
  liveCategories: () => getJson<Category[]>(x("get_live_categories")),
  liveStreams: (categoryId?: string) => getJson<LiveStream[]>(x("get_live_streams", { category_id: categoryId })),
  vodCategories: () => getJson<Category[]>(x("get_vod_categories")),
  vodStreams: (categoryId?: string) => getJson<VodStream[]>(x("get_vod_streams", { category_id: categoryId })),
  vodInfo: (id: string | number) => getJson<VodInfo>(x("get_vod_info", { vod_id: id })),
  seriesCategories: () => getJson<Category[]>(x("get_series_categories")),
  series: (categoryId?: string) => getJson<Series[]>(x("get_series", { category_id: categoryId })),
  seriesInfo: (id: string | number) => getJson<SeriesInfo>(x("get_series_info", { series_id: id })),

  // epg (decoded)
  epg: (streamId: string | number, limit = 8) =>
    getJson<{ epg_listings: EpgListing[] }>(`/api/epg?stream_id=${streamId}&limit=${limit}`),
};

export function streamSrc(kind: StreamKind, id: string | number, ext = "ts"): string {
  const path = `/api/stream?type=${kind}&id=${id}&ext=${encodeURIComponent(ext)}`;
  const baseUrl = kind === "live" ? VERCEL_URL : RAILWAY_URL;
  return baseUrl ? `${baseUrl}${path}` : path;
}

export async function resolveSrc(
  kind: StreamKind,
  id: string | number,
  ext: string,
): Promise<{ url: string | null; directOk: boolean; ext: string }> {
  return { url: null, directOk: true, ext };
}

export const fetchSeries = (categoryId?: string) => api.series(categoryId);
export const fetchSeriesCategories = () => api.seriesCategories();
