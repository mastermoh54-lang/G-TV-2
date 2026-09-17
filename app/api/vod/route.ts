// app/api/vod/route.ts (Sur Railway)
import { requireSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const creds = await requireSession();
    const { searchParams, origin } = new URL(req.url);

    const type = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    const ext = searchParams.get("ext") || "mkv";

    // Sécurité : Ne jamais appliquer ce traitement au Live TV
    if (!id || type === "live") {
      return new Response("Invalid VOD parameters", { status: 400 });
    }

    // Transmission des paramètres d'authentification à /api/transcode pour garantir le flux vidéo sans perte de session
    const targetUrl = `${origin}/api/transcode?type=${type}&id=${id}&ext=${ext}&host=${encodeURIComponent(creds.url)}&u=${encodeURIComponent(creds.username)}&p=${encodeURIComponent(creds.password)}`;

    return NextResponse.redirect(targetUrl);
  } catch (err: any) {
    return new Response(`VOD Route Error: ${err.message}`, { status: 500 });
  }
}
