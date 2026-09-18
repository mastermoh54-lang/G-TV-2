// app/api/episode/route.ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const creds = (await requireSession()) as any;
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    // On récupère l'extension fournie par ton Xtream (déjà la bonne !)
    const ext = searchParams.get("ext") || "mp4";

    if (!id) {
      return new Response("ID manquant", { status: 400 });
    }

    const rawHost = creds.baseUrl || creds.url || creds.serverUrl || creds.server || creds.host || "";
    if (!rawHost) {
      return new Response("URL du serveur manquante", { status: 400 });
    }

    const host = String(rawHost).replace(/\/+$/, "");
    const u = encodeURIComponent(creds.username || creds.user || "");
    const p = encodeURIComponent(creds.password || creds.pass || "");

    // 1. On construit le lien direct vers ton Vercel
    const targetUrl = `${host}/series/${u}/${p}/${id}.${ext}`;
    
    // 2. Redirection instantanée (ton lecteur affichera gmztv.vercel.app)
    return NextResponse.redirect(targetUrl);

  } catch (err: any) {
    return new Response(`Erreur Episode: ${err.message}`, { status: 500 });
  }
}
