// app/api/vod/route.ts
import { requireSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Remplace par ton vrai domaine Railway généré à l'étape 1
const RAILWAY_URL = "https://ton-projet-production.up.railway.app";

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

    // Redirection automatique des films/séries vers FFmpeg sur Railway pour le son AAC
    return NextResponse.redirect(`${RAILWAY_URL}/api/transcode?type=${type}&id=${id}&ext=${ext}`);
  } catch (err: any) {
    return new Response(`VOD Route Error: ${err.message}`, { status: 500 });
  }
}
