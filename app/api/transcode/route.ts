// app/api/transcode/route.ts
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export async function GET(req: Request) {
  let creds;
  try {
    creds = await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  // Sécurité : Vérification stricte des identifiants
  if (!creds || !creds.url || !creds.username || !creds.password) {
    console.error("[TRANSCODE] Error: Missing or invalid credentials session");
    return new Response("Invalid session credentials", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") as StreamKind) || "movie";
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mkv";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!id || type === "live") {
    return new Response("Invalid VOD parameters for transcode", { status: 400 });
  }

  // Nettoyage sécurisé de l'URL hôte
  const host = String(creds.url).replace(/\/+$/, "");
  const u = encodeURIComponent(creds.username);
  const p = encodeURIComponent(creds.password);

  // Construction de l'URL cible selon le type (Film vs Série)
  let inputUrl = "";
  if (type === "movie") {
    inputUrl = `${host}/movie/${u}/${p}/${id}.${ext}`;
  } else {
    inputUrl = `${host}/series/${u}/${p}/${id}.${ext}`;
  }

  // Paramètres FFmpeg pour conversion AC3/A52 B vers AAC Stéréo
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", inputUrl,
    "-c:v", "copy",       // Copie directe de la vidéo H.264
    "-c:a", "aac",        // Conversion audio en AAC compatible navigateurs web
    "-ac", "2",           // Stéréo 2 canaux
    "-b:a", "192k",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  console.log(`[TRANSCODE] ${type}/${id} input=${inputUrl} — Transcoding audio to AAC`);
  const ff = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });

  ff.stderr.on("data", (d) => {
    const s = String(d).trim();
    if (s) console.log(`[TRANSCODE] ffmpeg stderr: ${s}`);
  });

  const stream = new ReadableStream({
    start(controller) {
      ff.stdout.on("data", (chunk) => {
        try {
          if (controller.desiredSize !== null) {
            controller.enqueue(chunk);
          }
        } catch {}
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
}
