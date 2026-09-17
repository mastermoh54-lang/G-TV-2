// app/api/transcode/route.ts
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind, XtreamCredentials } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1. Récupération des identifiants (params URL ou session)
  let creds: XtreamCredentials | null = null;

  const host = searchParams.get("host");
  const username = searchParams.get("u");
  const password = searchParams.get("p");

  if (host && username && password) {
    creds = { url: host, username, password };
  } else {
    try {
      creds = await requireSession();
    } catch {}
  }

  if (!creds || !creds.url || !creds.username || !creds.password) {
    return new Response("Unauthorized stream access", { status: 401 });
  }

  const type = (searchParams.get("type") as StreamKind) || "movie";
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mp4";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!id || type === "live") {
    return new Response("Invalid VOD parameters", { status: 400 });
  }

  // 2. Localisation du flux jouable (détection automatique MKV / MP4)
  let located = null;
  const candidateExts = Array.from(new Set([ext, "mkv", "mp4", "avi"]));

  for (const currentExt of candidateExts) {
    try {
      const res = await locatePlayable(creds, type, id, currentExt);
      if (res && res.url) {
        located = res;
        break;
      }
    } catch {}
  }

  if (!located || !located.url) {
    return new Response("Title unavailable from provider", { status: 404 });
  }

  const input = located.url;

  // 3. Commandes FFmpeg pour remuxer la vidéo et convertir l'audio en AAC
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", input,
    "-c:v", "copy",
    "-c:a", "aac",
    "-ac", "2",
    "-b:a", "192k",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  console.log(`[TRANSCODE] ${type}/${id} input=${input} — Converting AC3 to AAC`);
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
