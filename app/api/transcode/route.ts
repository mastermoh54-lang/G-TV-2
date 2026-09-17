// app/api/transcode/route.ts
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1. Récupération prioritaire des identifiants transmis en paramètres URL
  let host = searchParams.get("host");
  let username = searchParams.get("u");
  let password = searchParams.get("p");

  // Fallback sur le cookie de session si disponible
  if (!host || !username || !password) {
    try {
      const creds = await requireSession();
      if (creds?.url && creds?.username && creds?.password) {
        host = creds.url;
        username = creds.username;
        password = creds.password;
      }
    } catch {}
  }

  if (!host || !username || !password) {
    console.error("[TRANSCODE] Error 401: No credentials provided");
    return new Response("Unauthorized stream access", { status: 401 });
  }

  const type = (searchParams.get("type") as StreamKind) || "movie";
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mkv";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!id || type === "live") {
    return new Response("Invalid parameters", { status: 400 });
  }

  const cleanHost = String(host).replace(/\/+$/, "");
  const u = encodeURIComponent(username);
  const p = encodeURIComponent(password);

  // Construction de l'URL brute selon qu'il s'agisse d'un film ou d'une série
  let inputUrl = "";
  if (type === "series") {
    inputUrl = `${cleanHost}/series/${u}/${p}/${id}.${ext}`;
  } else {
    inputUrl = `${cleanHost}/movie/${u}/${p}/${id}.${ext}`;
  }

  // Configuration FFmpeg : Copie de la vidéo + Conversion de l'audio Dolby/AC3 en AAC
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", inputUrl,
    "-c:v", "copy",       // Copie directe de l'image (0 lag CPU)
    "-c:a", "aac",        // Conversion audio AAC pour compatibilité web
    "-ac", "2",           // Stéréo 2 canaux
    "-b:a", "192k",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  console.log(`[TRANSCODE] ${type}/${id} input=${inputUrl} — Remuxing audio via FFmpeg`);
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
