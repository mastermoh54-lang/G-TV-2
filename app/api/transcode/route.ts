// app/api/transcode/route.ts
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind, XtreamCredentials } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1. Récupération des identifiants (Params URL envoyés par /api/vod ou session)
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

  // 2. Utilisation de TA fonction native pour garantir une URL parfaite chez le fournisseur
  const inputUrl = buildStreamUrl(creds, type, id, ext);

  // 3. Traitement FFmpeg direct (Copie vidéo, conversion audio Dolby/AC3 vers AAC)
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", inputUrl,
    "-c:v", "copy",
    "-c:a", "aac",
    "-ac", "2",
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
          if (controller.desiredSize !== null) controller.enqueue(chunk);
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
