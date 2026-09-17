import { requireSession } from "@/lib/session";
import { getUrl } from "@/lib/hls/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");
  if (!token) return new Response("Missing token", { status: 400 });

  const targetUrl = getUrl(token);
  if (!targetUrl) return new Response("Segment token expired or invalid", { status: 404 });

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
      },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error ${upstream.status}`, { status: upstream.status });
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "video/mp2t");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return new Response(`Segment Proxy Error: ${err.message}`, { status: 502 });
  }
}
