// app/api/vod/route.ts
import { requireSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const creds = await requireSession();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    const ext = searchParams.get("ext") || "mp4";
    const t = searchParams.get("t") || "0"; // Capture l'avance rapide

    if (!id || type === "live") {
      return new Response("Invalid VOD parameters", { status: 400 });
    }

    // FIX VITAL RAILWAY : Force l'utilisation du vrai domaine public au lieu de localhost
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const hostHeader = req.headers.get("host") || "localhost";
    const baseUrl = `${protocol}://${hostHeader}`;

    // Transmission des identifiants au transcodeur pour éviter l'erreur 401 du lecteur HTML5
    const targetUrl = `${baseUrl}/api/transcode?type=${type}&id=${id}&ext=${ext}&t=${t}&host=${encodeURIComponent(creds.url)}&u=${encodeURIComponent(creds.username)}&p=${encodeURIComponent(creds.password)}`;

    return NextResponse.redirect(targetUrl);
  } catch (err: any) {
    return new Response(`VOD Route Error: ${err.message}`, { status: 500 });
  }
}
