import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind } from "@/lib/xtream/types";
import { NextResponse } from "next/server";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

export async function GET(req: Request) {
  try {
    const creds = await requireSession();
    const { searchParams, origin } = new URL(req.url);
    const type = searchParams.get("type") as StreamKind | null;
    const id = searchParams.get("id");
    let ext = searchParams.get("ext") || "mp4";

    if (!type || !id) return new Response("Bad request", { status: 400 });

    // Live TV -> Redirection automatique vers le proxy HLS sécurisé
    if (type === "live") {
      return NextResponse.redirect(`${origin}/api/hls?id=${id}`);
    }

    // Films et Séries (VOD) -> Conversion des extensions MKV en MP4
    if (ext.toLowerCase() === "mkv") ext = "mp4";
    const targetUrl = buildStreamUrl(creds, type, id, ext);

    return new Promise<Response>((resolve) => {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const headers: Record<string, string> = { "User-Agent": UA, Accept: "*/*" };
      const range = req.headers.get("range");
      if (range) headers["Range"] = range;

      const proxyReq = client.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: "GET",
          headers,
          rejectUnauthorized: false,
        },
        (upstreamRes) => {
          const respHeaders = new Headers();
          respHeaders.set("Content-Type", upstreamRes.headers["content-type"] || "video/mp4");
          respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
          respHeaders.set("Access-Control-Allow-Origin", "*");

          if (upstreamRes.headers["content-length"]) {
            respHeaders.set("Content-Length", upstreamRes.headers["content-length"]);
          }
          if (upstreamRes.headers["content-range"]) {
            respHeaders.set("Content-Range", upstreamRes.headers["content-range"]);
          }

          const stream = new ReadableStream({
            start(controller) {
              upstreamRes.on("data", (chunk) => {
                try { controller.enqueue(chunk); } catch {}
              });
              upstreamRes.on("end", () => {
                try { controller.close(); } catch {}
              });
              upstreamRes.on("error", () => {
                try { controller.close(); } catch {}
              });
            },
            cancel() {
              upstreamRes.destroy();
            },
          });

          resolve(new Response(stream, { status: upstreamRes.statusCode || 200, headers: respHeaders }));
        }
      );

      proxyReq.on("error", (err) => resolve(new Response(`Proxy Error: ${err.message}`, { status: 502 })));
      proxyReq.end();
    });
  } catch (err: any) {
    return new Response(`Fatal Error: ${err.message}`, { status: 500 });
  }
}
