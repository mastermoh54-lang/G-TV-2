// app/api/vod/route.ts
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export async function GET(req: Request) {
  try {
    const creds = (await requireSession()) as any;
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    let ext = searchParams.get("ext") || "mp4";
    const t = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

    if (!id || type === "live") {
      return new Response("Invalid parameters", { status: 400 });
    }

    // --- CORRECTION DU BUG "UNDEFINED" ---
    // Tes logs indiquent que le lien est stocké sous "baseUrl" !
    const rawHost = creds.baseUrl || creds.url || creds.serverUrl || creds.server || creds.host || "";
    
    if (!rawHost) {
      console.error("[VOD] ❌ Erreur : Impossible de trouver l'URL du serveur dans la session", creds);
      return new Response("URL du serveur manquante", { status: 400 });
    }

    const host = String(rawHost).replace(/\/+$/, "");
    const u = encodeURIComponent(creds.username || creds.user || "");
    const p = encodeURIComponent(creds.password || creds.pass || "");
    const folder = type === "series" ? "series" : "movie";

    // --- CONSTRUCTION DU LIEN XTREAM ---
    let inputUrl = `${host}/${folder}/${u}/${p}/${id}.${ext}`;
    console.log(`[VOD] 🔗 Test du lien : ${inputUrl}`);

    // --- ANTI-PLANTAGE (Vérification 404 MP4 vs MKV) ---
    // Si le fournisseur renvoie 404 sur le mp4, on passe automatiquement au mkv
    try {
      const check = await fetch(inputUrl, { method: "HEAD", headers: { "User-Agent": UA } });
      if (!check.ok && check.status === 404) {
         console.log(`[VOD] ⚠️ Erreur 404 sur .${ext}, tentative avec l'extension alternative...`);
         ext = ext === "mp4" ? "mkv" : "mp4";
         inputUrl = `${host}/${folder}/${u}/${p}/${id}.${ext}`;
      }
    } catch (e) {
      console.log("[VOD] Impossible de vérifier l'URL avec HEAD, on force la lecture...");
    }

    // --- LECTURE FFMPEG ---
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
