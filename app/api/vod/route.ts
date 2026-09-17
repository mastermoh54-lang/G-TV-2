// app/api/vod/route.ts
import { requireSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams, origin } = new URL(req.url);

    const type = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    const ext = searchParams.get("ext") || "mkv";

    // Sécurité : Interdiction stricte de traiter le Live TV ici
    if (!id || type === "live") {
      return new Response("Invalid VOD parameters", { status: 400 });
    }

    // Redirection automatique vers le transcodeur FFmpeg sur Railway pour convertir l'audio AC3/DTS en AAC
    return NextResponse.redirect(
      `${origin}/api/transcode?type=${type}&id=${id}&ext=${ext}`
    );
  } catch (err: any) {
    return new Response(`VOD Route Error: ${err.message}`, { status: 500 });
  }
}
