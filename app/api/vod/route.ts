// app/api/vod/route.ts
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

// Nouveau radar furtif : utilise un GET partiel au lieu de HEAD (anti-blocage IPTV)
async function checkUrl(url: string) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { 
        "User-Agent": UA,
        // On demande juste les 100 premiers octets pour ne rien télécharger
        "Range": "bytes=0-100" 
      }
    });
    // 200 OK ou 206 Partial Content = Le fichier existe bien !
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const creds = (await requireSession()) as any;
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    const originalExt = searchParams.get("ext") || "mp4";
    const t = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

    if (!id || type === "live") {
      return new Response("Invalid parameters", { status: 400 });
    }

    const rawHost = creds.baseUrl || creds.url || creds.serverUrl || creds.server || creds.host || "";
    if (!rawHost) {
      return new Response("URL du serveur manquante", { status: 400 });
    }

    const host = String(rawHost).replace(/\/+$/, "");
    const u = encodeURIComponent(creds.username || creds.user || "");
    const p = encodeURIComponent(creds.password || creds.pass || "");
    const folder = type === "series" ? "series" : "movie";

    let inputUrl = `${host}/${folder}/${u}/${p}/${id}.${originalExt}`;
    
    console.log(`[VOD] 🔍 Vérification du lien principal : ${inputUrl}`);
    
    let isOk = await checkUrl(inputUrl);

    if (!isOk) {
      console.log(`[VOD] ⚠️ Format .${originalExt} introuvable ou bloqué. Test des alternatives...`);
      // L'arme secrète : on teste toutes les extensions courantes d'une traite
      const fallbacks = ["mp4", "mkv", "avi", "ts"].filter(e => e !== originalExt);
      
      for (const altExt of fallbacks) {
        const altUrl = `${host}/${folder}/${u}/${p}/${id}.${altExt}`;
        if (await checkUrl(altUrl)) {
          console.log(`[VOD] ✅ Alternative trouvée ! On utilise : .${altExt}`);
          inputUrl = altUrl;
          isOk = true;
          break;
        }
      }
    }

    if (!isOk) {
       console.log(`[VOD] ❌ Toutes les extensions ont échoué. On force la lecture en aveugle...`);
    }

    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-user_agent", UA,
      ...(t > 0 ? ["-ss", String(t)] : []),
      "-i", inputUrl,
      "-c:v", "copy",
      "-c:a", "aac",
      "-ac", "2",
      "-b:a", "192k",
      "-movflags", "frag_keyframe+empty_moov+default_base_moof",
      "-f", "mp4",
      "pipe:1",
    ];

    console.log(`[VOD] 🚀 Lancement FFmpeg -> ${inputUrl}`);
    const ff = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });

    ff.stderr.on("data", (d) => {
      const s = String(d).trim();
      if (s) console.log(`[FFMPEG] ${s}`);
    });

    const stream = new ReadableStream({
      start(controller) {
        ff.stdout.on("data", (chunk) => {
          try { if (controller.desiredSize !== null) controller.enqueue(chunk); } catch {}
        });
        ff.stdout.on("end", () => {
          try { controller.close(); } catch {}
        });
        ff.on("error", (err) => {
          try { controller.error(err); } catch {}
        });
      },
      cancel() {
        if (!ff.killed) ff.kill("SIGKILL");
      },
    });

    req.signal.addEventListener("abort", () => {
      if (!ff.killed) ff.kill("SIGKILL");
    });

    return new Response(stream, {
      headers: {
        "content-type": "video/mp4",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  } catch (err: any) {
    console.error("[VOD] Crash total :", err);
    return new Response(`Erreur VOD: ${err.message}`, { status: 500 });
  }
}
