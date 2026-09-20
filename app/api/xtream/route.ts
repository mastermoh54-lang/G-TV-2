import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind } from "@/lib/xtream/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// URL Railway définie dans les variables d'environnement Vercel
const RAILWAY_URL = (process.env.NEXT_PUBLIC_RAILWAY_URL || "").replace(/\/$/, "");

// Secret partagé entre Vercel et Railway
const RAILWAY_SECRET = process.env.GTV_RAILWAY_SECRET || "";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

export async function GET(req: Request) {
  try {
    // ============================================================
    // SESSION VERCEL
    // ============================================================

    const creds = await requireSession();

    const { searchParams, origin } = new URL(req.url);

    const type = searchParams.get("type") as StreamKind | null;
    const id = searchParams.get("id");
    let ext = searchParams.get("ext") || "mp4";

    if (!type || !id) {
      return new Response("Bad request", {
        status: 400,
      });
    }

    // ============================================================
    // LIVE
    // ============================================================
    //
    // Live reste entièrement sur Vercel.
    //
    // Vercel /api/stream
    //       ↓
    // Vercel /api/hls
    //       ↓
    // Xtream
    //
    // ============================================================

    if (type === "live") {
      return NextResponse.redirect(
        `${origin}/api/hls?id=${encodeURIComponent(id)}`,
      );
    }

    // ============================================================
    // MOVIE / SERIES
    // ============================================================

    if (type !== "movie" && type !== "series") {
      return new Response("Invalid stream type", {
        status: 400,
      });
    }

    // Railway doit être configuré
    if (!RAILWAY_URL) {
      return new Response(
        "Railway URL is not configured",
        {
          status: 500,
        },
      );
    }

    // Secret obligatoire
    if (!RAILWAY_SECRET) {
      return new Response(
        "Railway secret is not configured",
        {
          status: 500,
        },
      );
    }

    // ============================================================
    // NORMALISATION EXTENSION
    // ============================================================

    if (ext.toLowerCase() === "mkv") {
      ext = "mp4";
    }

    // ============================================================
    // URL DU STREAM XTREAM
    // ============================================================
    //
    // On utilise buildStreamUrl uniquement pour générer
    // l'URL réelle côté provider.
    //
    // IMPORTANT :
    // Cette URL n'est PAS envoyée au navigateur.
    // Elle est envoyée à Railway.
    //
    // ============================================================

    const targetUrl = buildStreamUrl(
      creds,
      type,
      id,
      ext,
    );

    // ============================================================
    // ENCODAGE DES CREDENTIALS
    // ============================================================
    //
    // Les credentials restent côté serveur.
    //
    // Railway reçoit :
    //
    // X-GTV-Credentials: base64(...)
    //
    // ============================================================

    const credentialsPayload = Buffer.from(
      JSON.stringify({
        baseUrl: creds.baseUrl,
        username: creds.username,
        password: creds.password,
      }),
      "utf8",
    ).toString("base64");

    // ============================================================
    // APPEL RAILWAY
    // ============================================================

    const railwayUrl =
      `${RAILWAY_URL}/api/stream` +
      `?type=${encodeURIComponent(type)}` +
      `&id=${encodeURIComponent(id)}` +
      `&ext=${encodeURIComponent(ext)}`;

    const headers: HeadersInit = {
      "User-Agent": UA,

      // Authentification Vercel → Railway
      "X-GTV-Secret": RAILWAY_SECRET,

      // Credentials Xtream
      "X-GTV-Credentials": credentialsPayload,

      // Indique à Railway l'URL provider à utiliser.
      // Railway peut l'utiliser directement.
      "X-GTV-Target": targetUrl,

      Accept: "*/*",
    };

    // ============================================================
    // RANGE
    // ============================================================
    //
    // Indispensable pour :
    // - seek
    // - avance rapide
    // - reprise
    // - lecture partielle
    //
    // ============================================================

    const range = req.headers.get("range");

    if (range) {
      headers["Range"] = range;
    }

    // ============================================================
    // FETCH RAILWAY
    // ============================================================

    const railwayResponse = await fetch(
      railwayUrl,
      {
        method: "GET",
        headers,
        redirect: "manual",
        cache: "no-store",
      },
    );

    // ============================================================
    // ERREUR RAILWAY
    // ============================================================

    if (!railwayResponse.ok) {
      const text = await railwayResponse.text().catch(() => "");

      return new Response(
        text || `Railway stream error (${railwayResponse.status})`,
        {
          status: railwayResponse.status,
        },
      );
    }

    // ============================================================
    // HEADERS DE RÉPONSE
    // ============================================================

    const responseHeaders = new Headers();

    const contentType =
      railwayResponse.headers.get("content-type");

    const contentLength =
      railwayResponse.headers.get("content-length");

    const contentRange =
      railwayResponse.headers.get("content-range");

    const acceptRanges =
      railwayResponse.headers.get("accept-ranges");

    if (contentType) {
      responseHeaders.set(
        "Content-Type",
        contentType,
      );
    } else {
      responseHeaders.set(
        "Content-Type",
        "video/mp4",
      );
    }

    if (contentLength) {
      responseHeaders.set(
        "Content-Length",
        contentLength,
      );
    }

    if (contentRange) {
      responseHeaders.set(
        "Content-Range",
        contentRange,
      );
    }

    if (acceptRanges) {
      responseHeaders.set(
        "Accept-Ranges",
        acceptRanges,
      );
    } else {
      responseHeaders.set(
        "Accept-Ranges",
        "bytes",
      );
    }

    responseHeaders.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );

    responseHeaders.set(
      "Access-Control-Allow-Origin",
      "*",
    );

    // ============================================================
    // STREAM
    // ============================================================

    return new Response(
      railwayResponse.body,
      {
        status: railwayResponse.status,
        headers: responseHeaders,
      },
    );
  } catch (err) {
    console.error(
      "Stream proxy error:",
      err,
    );

    const message =
      err instanceof Error
        ? err.message
        : "Unknown stream error";

    return new Response(
      `Fatal Error: ${message}`,
      {
        status: 500,
      },
    );
  }
}
