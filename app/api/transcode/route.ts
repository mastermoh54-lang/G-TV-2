// app/api/transcode/route.ts (Railway uniquement)
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1. Essai de récupération de la session active
  let creds;
  try {
    creds = await requireSession();
  } catch {
    // Si pas de cookie transmis par la vidéo, secours via paramètres URL éventuels
  }

  const host = creds?.url || searchParams.get("host");
  const username = creds?.username || searchParams.get("u");
  const password = creds?.password || searchParams.get("p");

  if (!host || !username || !password) {
    console.error("[TRANSCODE] Error: Credentials unavailable for media stream");
    return new Response("Unauthorized stream access", { status: 401 });
  }

  const type = (searchParams.get("type") as StreamKind) || "movie";
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mkv";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!id || type === "live") {
    return new Response("Invalid VOD parameters", { status: 400 });
  }

  const cleanHost = String(host).replace(/\/+$/, "");
  const u = encodeURIComponent(username);
  const p = encodeURIComponent(password);

  // Construction dynamique des URLs selon le type (Film vs Série)
  let inputUrl = "";
  if (type === "movie") {
    inputUrl = `${cleanHost}/movie/${u}/${p}/${id}.${ext}`;
  } else {
    inputUrl = `${cleanHost}/series/${u}/${p}/${id}.${ext}`;
  }

  // Conversion audio AC3/A52 B/DTS vers AAC Stéréo
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", inputUrl,
    "-c:v", "copy",       // Inchangé : vidéo H.264 ultra rapide
    "-c:a", "aac",        // Convertit l'audio AC3 5.1 / A/52 B en AAC
    "-ac", "2",           // Stéréo 2 canaux universel
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
