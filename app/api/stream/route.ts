import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind } from "@/lib/xtream/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const creds = await requireSession();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") as StreamKind | null;
    const id = searchParams.get("id");
    let ext = searchParams.get("ext") || "m3u8";

    if (!type || !id) {
      return new Response("Missing parameters", { status: 400 });
    }

    if (type === "live") {
      ext = "m3u8";
    } else if (ext.toLowerCase() === "mkv") {
      ext = "mp4";
    }

    const targetUrl = buildStreamUrl(creds, type, id, ext);

    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    return new Response(`Stream Error: ${err.message}`, { status: 500 });
  }
}
