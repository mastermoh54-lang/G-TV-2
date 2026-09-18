// app/api/series/route.ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// On garde juste un petit radar rapide pour vérifier si c'est MP4 ou MKV
async function checkUrl(url: string) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Range": "bytes=0-100" } // Demande juste 100 octets pour tester
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const creds = (await requireSession()) as any;
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const originalExt = searchParams.get("ext") || "mp4";

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

    // 1. On construit le lien direct vers ton Vercel (gmztv.vercel.app)
    let targetUrl = `${host}/series/${u}/${p}/${id}.${originalExt}`;
    
    // 2. On vérifie vite fait si l'épisode existe avec cette extension
    let isOk = await checkUrl(targetUrl);

    if (!isOk) {
      // Si 404, on teste les autres extensions (MKV, AVI...)
      const fallbacks = ["mp4", "mkv", "avi", "ts"].filter(e => e !== originalExt);
      for (const altExt of fallbacks) {
        const altUrl = `${host}/series/${u}/${p}/${id}.${altExt}`;
        if (await checkUrl(altUrl)) {
          targetUrl = altUrl; // On a trouvé la bonne extension !
          break;
        }
      }
    }

    // 3. LA MAGIE EST ICI : Au lieu de transcodage FFmpeg complexe, 
    // on REDIRIGE ton navigateur directement vers Vercel (comme pour les films).
    return NextResponse.redirect(targetUrl);

  } catch (err: any) {
    return new Response(`Erreur SERIES: ${err.message}`, { status: 500 });
  }
}
