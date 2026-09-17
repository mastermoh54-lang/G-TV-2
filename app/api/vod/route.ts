// app/api/vod/route.ts
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

    if (!id || type === "live") {
      return new Response("Invalid VOD parameters", { status: 400 });
    }

    // On passe les identifiants directement en Query Params pour sauter le problème de cookie sur la balise vidéo HTML5
    const targetUrl = `${origin}/api/transcode?type=${type}&id=${id}&ext=${ext}&host=${encodeURIComponent(creds.url)}&u=${encodeURIComponent(creds.username)}&p=${encodeURIComponent(creds.password)}`;

    return NextResponse.redirect(targetUrl);
  } catch (err: any) {
    return new Response(`VOD Route Error: ${err.message}`, { status: 500 });
  }
}
