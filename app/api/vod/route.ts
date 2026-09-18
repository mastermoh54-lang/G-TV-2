// app/api/vod/route.ts
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export async function GET(req: Request) {
  try {
    // 1. Authentification directe (plus de problème de redirection ou de 401)
    const creds = await requireSession();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    const ext = searchParams.get("ext") || "mp4";
    const t = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

    // Sécurité : le Live n'est jamais touché par ce fichier
    if (!id || type === "live") {
      return new Response("Invalid parameters", { status: 400 });
    }

    const host = String(creds.url).replace(/\/+$/, "");
    const u = encodeURIComponent(creds.username);
    const p = encodeURIComponent(creds.password);
    const folder = type === "series" ? "series" : "movie";

    // 2. Construction de l'URL Xtream
    let inputUrl = `${host}/${folder}/${u}/${p}/${id}.${ext}`;

    // 3. Vérification ANTI-PLANTAGE (Répare le "Can't play this stream")
    // On teste si l'URL existe. Si le fournisseur dit "404 Not Found", on change l'extension.
    try {
      const check = await fetch(inputUrl, { method: "HEAD", headers: { "User-Agent": UA } });
      if (!check.ok) {
        const altExt = ext === "mp4" ? "mkv" : "mp4";
        inputUrl = `${host}/${folder}/${u}/${p}/${id}.${altExt}`;
      }
    } catch (e) {
      // Si la vérification échoue, on tente quand même de lire le flux
    }

    // 4. Lancement direct de FFmpeg (Son AAC garanti pour les films et séries)
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-user_agent", UA,
      ...(t > 0 ? ["-ss", String(t)] : []),
      "-i", inputUrl,
      "-c:v", "copy",       // L'image n'est pas touchée (aucun lag)
      "-c:a", "aac",        // Le son est converti pour les navigateurs web
      "-ac", "2",
      "-b:a", "192k",
      "-movflags", "frag_keyframe+empty_moov+default_base_moof",
      "-f", "mp4",
      "pipe:1",
    ];

    console.log(`[VOD] Lecture directe via FFmpeg -> ${inputUrl}`);
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
    return new Response(`Erreur VOD: ${err.message}`, { status: 401 });
  }
}
