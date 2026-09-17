// app/api/vod/route.ts (Sur Vercel)
import { requireSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ton URL Railway de transcodage
const RAILWAY_URL = "https://g-tv-2-production.up.railway.app";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    const ext = searchParams.get("ext") || "mkv";

    if (!id || type === "live") {
      return new Response("Invalid VOD parameters", { status: 400 });
    }

    // Vercel redirige le flux film/série vers Railway pour ré-encoder l'AC3 en AAC
    return NextResponse.redirect(
      `${RAILWAY_URL}/api/transcode?type=${type}&id=${id}&ext=${ext}`
    );
  } catch (err: any) {
    return new Response(`VOD Route Error: ${err.message}`, { status: 500 });
  }
}
