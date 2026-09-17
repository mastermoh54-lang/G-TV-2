// app/api/transcode/route.ts (Sur Railway)
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

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") as StreamKind) || "movie";
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mkv";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!id || type === "live") {
    return new Response("Invalid VOD parameters for transcode", { status: 400 });
  }

  const host = creds.url.replace(/\/+$/, "");
  const u = encodeURIComponent(creds.username);
  const p = encodeURIComponent(creds.password);

  // Construction dynamique des URLs selon le type (Film vs Série)
  let inputUrls: string[] = [];

  if (type === "movie") {
    // Les 2 formats d'URL courants chez les fournisseurs Xtream pour les films
    inputUrls = [
      `${host}/movie/${u}/${p}/${id}.${ext}`,
      `${host}/vod.php?username=${u}&password=${p}&stream=${id}&extension=${ext}`,
      `${host}/movie/${u}/${p}/${id}.mp4`
    ];
  } else {
    // Format pour les séries
    inputUrls = [
      `${host}/series/${u}/${p}/${id}.${ext}`,
      `${host}/series/${u}/${p}/${id}.mp4`,
      `${host}/vod.php?username=${u}&password=${p}&stream=${id}&extension=${ext}`
    ];
  }

  // On prend la première URL construite
  const inputUrl = inputUrls[0];

  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", inputUrl,
    "-c:v", "copy",       // Inchangé : vidéo H.264
    "-c:a", "aac",        // Convertit l'audio AC3 / A/52 B / DTS en AAC
    "-ac", "2",           // Conversion en Stéréo
    "-b:a", "192k",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  console.log(`[TRANSCODE] ${type}/${id} input=${inputUrl} — Transcoding audio to AAC via FFmpeg`);
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
