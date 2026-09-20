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

// Railway est utilisé uniquement pour les films et les séries.
// Définir dans Vercel :
// NEXT_PUBLIC_RAILWAY_URL=https://ton-projet.up.railway.app
const RAILWAY_URL = (process.env.NEXT_PUBLIC_RAILWAY_URL || "").replace(/\/$/, "");

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
  });

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

const x = (
  action: string,
  params: Record<string, string | number | undefined> = {},
) => {
  const sp = new URLSearchParams({ action });

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      sp.set(k, String(v));
    }
  }

  return `/api/xtream?${sp.toString()}`;
};

export const api = {
  session: () =>
    getJson<{
      authenticated: boolean;
      baseUrl?: string;
      username?: string;
      user_info?: AuthResponse["user_info"];
      server_info?: AuthResponse["server_info"];
    }>("/api/auth"),

  login: async (
    baseUrl: string,
    username: string,
    password: string,
  ) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        baseUrl,
        username,
        password,
      }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Login failed");
    }

    return data as {
      ok: true;
      user_info: AuthResponse["user_info"];
      server_info: AuthResponse["server_info"];
    };
  },

  logout: () =>
    fetch("/api/auth", {
      method: "DELETE",
      credentials: "include",
    }),

  // -------------------------
  // LIVE → VERCEL
  // -------------------------

  liveCategories: () =>
    getJson<Category[]>(
      x("get_live_categories"),
    ),

  liveStreams: (categoryId?: string) =>
    getJson<LiveStream[]>(
      x("get_live_streams", {
        category_id: categoryId,
      }),
    ),

  // -------------------------
  // VOD → VERCEL catalogue
  // STREAM → RAILWAY
  // -------------------------

  vodCategories: () =>
    getJson<Category[]>(
      x("get_vod_categories"),
    ),

  vodStreams: (categoryId?: string) =>
    getJson<VodStream[]>(
      x("get_vod_streams", {
        category_id: categoryId,
      }),
    ),

  vodInfo: (id: string | number) =>
    getJson<VodInfo>(
      x("get_vod_info", {
        vod_id: id,
      }),
    ),

  // -------------------------
  // SERIES → VERCEL catalogue
  // STREAM → RAILWAY
  // -------------------------

  seriesCategories: () =>
    getJson<Category[]>(
      x("get_series_categories"),
    ),

  series: (categoryId?: string) =>
    getJson<Series[]>(
      x("get_series", {
        category_id: categoryId,
      }),
    ),

  seriesInfo: (id: string | number) =>
    getJson<SeriesInfo>(
      x("get_series_info", {
        series_id: id,
      }),
    ),

  // -------------------------
  // EPG → VERCEL
  // -------------------------

  epg: (
    streamId: string | number,
    limit = 8,
  ) =>
    getJson<{ epg_listings: EpgListing[] }>(
      `/api/epg?stream_id=${encodeURIComponent(
        String(streamId),
      )}&limit=${encodeURIComponent(String(limit))}`,
    ),
};

// ============================================================
// STREAM ROUTING
// ============================================================

export function streamSrc(
  kind: StreamKind,
  id: string | number,
  ext = "mp4",
): string {
  const path =
    `/api/stream?type=${encodeURIComponent(String(kind))}` +
    `&id=${encodeURIComponent(String(id))}` +
    `&ext=${encodeURIComponent(ext)}`;

  // LIVE → VERCEL
  if (kind === "live") {
    return path;
  }

  // MOVIE + SERIES → RAILWAY
  if (kind === "movie" || kind === "series") {
    if (!RAILWAY_URL) {
      console.error(
        "NEXT_PUBLIC_RAILWAY_URL is not configured.",
      );

      // Fallback Vercel
      return path;
    }

    return `${RAILWAY_URL}${path}`;
  }

  return path;
}

export async function resolveSrc(
  kind: StreamKind,
  id: string | number,
  ext: string,
): Promise<{
  url: string | null;
  directOk: boolean;
  ext: string;
}> {
  return {
    url: null,
    directOk: true,
    ext,
  };
}

export const fetchSeries = (
  categoryId?: string,
) => api.series(categoryId);

export const fetchSeriesCategories = () =>
  api.seriesCategories();
