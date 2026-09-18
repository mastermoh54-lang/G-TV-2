// app/api/vod/route.ts
import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind } from "@/lib/xtream/types";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

export async function GET(req: Request) {
  try {
    const creds = await requireSession();
    const { searchParams } = new URL(req.url);

    const type = (searchParams.get("type") as StreamKind) || "movie";
    const id = searchParams.get("id");
    let ext = searchParams.get("ext") || "mp4";

    if (!id || type === "live") {
      return new Response("Invalid VOD parameters", { status: 400 });
    }

    // Normalisation de l'extension pour l'URL du fournisseur Xtream
    if (ext.toLowerCase() === "mkv" || !ext) {
      ext = "mp4";
    }

    const targetUrl = buildStreamUrl(creds, type, id, ext);

    return new Promise<Response>((resolve) => {
      const fetchWithFollow = (url: string, redirectCount = 0) => {
        if (redirectCount > 5) {
          return resolve(new Response("Too many redirects from provider", { status: 502 }));
        }

        const parsed = new URL(url);
        const isHttps = parsed.protocol === "https:";
        const client = isHttps ? https : http;

        const headers: Record<string, string> = {
          "User-Agent": UA,
          Accept: "*/*",
        };

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
            // Suivre les redirections 301/302 du CDN du serveur IPTV
            if (
              upstreamRes.statusCode &&
              [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
              upstreamRes.headers.location
            ) {
              const redirectUrl = new URL(upstreamRes.headers.location, url).toString();
              return fetchWithFollow(redirectUrl, redirectCount + 1);
            }

            const respHeaders = new Headers();
            respHeaders.set("Content-Type", "video/mp4");
            respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
            respHeaders.set("Access-Control-Allow-Origin", "*");
            respHeaders.set("Accept-Ranges", "bytes");

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

            resolve(
              new Response(stream, {
                status: upstreamRes.statusCode || 200,
                headers: respHeaders,
              })
            );
          }
        );

        proxyReq.on("error", (err) => resolve(new Response(`VOD Proxy Error: ${err.message}`, { status: 502 })));
        proxyReq.end();
      };

      fetchWithFollow(targetUrl);
    });
  } catch (err: any) {
    return new Response(`Fatal Error: ${err.message}`, { status: 500 });
  }
}
