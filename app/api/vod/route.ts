// app/api/vod/route.ts
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

    const type = (searchParams.get("type") as StreamKind) || "movie";
    const id = searchParams.get("id");
    const ext = searchParams.get("ext") || "mp4";
    const forceTranscode = searchParams.get("transcode") === "true";

    if (!id || type === "live") {
      return new Response("Invalid VOD parameters", { status: 400 });
    }

    // Si transcode est demandé OU si l'extension est mkv (son AC3/DTS muet sur navigateur),
    // redirection directe vers le service FFmpeg sur Railway pour convertir l'audio en AAC
    if (ext.toLowerCase() === "mkv" || forceTranscode) {
      return NextResponse.redirect(
        `${origin}/api/transcode?type=${type}&id=${id}&ext=mkv`
      );
    }

    const targetUrl = buildStreamUrl(creds, type, id, ext);

    return new Promise<Response>((resolve) => {
      const fetchWithFollow = (url: string, redirectCount = 0) => {
        if (redirectCount > 5) {
          return resolve(new Response("Too many redirects", { status: 502 }));
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
            if (
              upstreamRes.statusCode &&
              [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
              upstreamRes.headers.location
            ) {
              const redirectUrl = new URL(upstreamRes.headers.location, url).toString();
              return fetchWithFollow(redirectUrl, redirectCount + 1);
            }

            // Détection si la source distante renvoie un conteneur Matroska/MKV
            const contentType = upstreamRes.headers["content-type"] || "";
            if (contentType.includes("matroska") || contentType.includes("x-mkv")) {
              return resolve(
                NextResponse.redirect(
                  `${origin}/api/transcode?type=${type}&id=${id}&ext=mkv`
                )
              );
            }

            const respHeaders = new Headers();
            respHeaders.set("Content-Type", contentType || "video/mp4");
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

        proxyReq.on("error", (err) => resolve(new Response(`Proxy Error: ${err.message}`, { status: 502 })));
        proxyReq.end();
      };

      fetchWithFollow(targetUrl);
    });
  } catch (err: any) {
    return new Response(`Fatal Error: ${err.message}`, { status: 500 });
  }
}
