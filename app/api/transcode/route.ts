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

  // 1. Récupération des identifiants (Params URL envoyés par /api/vod ou session)
  let host = searchParams.get("host");
  let username = searchParams.get("u");
  let password = searchParams.get("p");

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
    return new Response("Unauthorized stream access", { status: 401 });
  }

  const type = (searchParams.get("type") as StreamKind) || "movie";
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mp4";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!id || type === "live") {
    return new Response("Invalid VOD parameters", { status: 400 });
  }

  const cleanHost = String(host).replace(/\/+$/, "");
  const u = encodeURIComponent(username);
  const p = encodeURIComponent(password);

  // 2. Construction directe de l'URL Xtream brute (sans sonder)
  const folder = type === "series" ? "series" : "movie";
  const inputUrl = `${cleanHost}/${folder}/${u}/${p}/${id}.${ext}`;

  // 3. Traitement FFmpeg direct
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", inputUrl,
    "-c:v", "copy",       // Vidéo intacte (0% CPU)
    "-c:a", "aac",        // Re-encode uniquement l'audio AC3/A52 B en AAC
    "-ac", "2",           // Stéréo
    "-b:a", "192k",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  console.log(`[TRANSCODE] Direct stream: ${inputUrl}`);
  const ff = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });

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
