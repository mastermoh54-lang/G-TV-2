import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";
import { locatePlayable } from "@/lib/xtream/locate";
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
  const type = searchParams.get("type") as StreamKind | null;
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mkv";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!type || !id) return new Response("Bad request", { status: 400 });

  // 1. Recherche avec l'extension demandée
  let located = await locatePlayable(creds, type, id, ext);

  // 2. Fallback : Si l'extension demandée (ex: mkv) n'existe pas, tester mp4 et d'autres conteneurs
  if (!located) {
    const fallbackExts = ["mp4", "mkv", "avi"].filter((e) => e !== ext);
    for (const altExt of fallbackExts) {
      located = await locatePlayable(creds, type, id, altExt);
      if (located) break;
    }
  }

  if (!located) {
    console.log(`[TRANSCODE] ${type}/${id} UNAVAILABLE (no playable container found)`);
    return new Response("Title unavailable from provider", { status: 404 });
  }

  const input = located.url;

  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", input,
    "-c:v", "copy", // Copie vidéo directe sans charge CPU
    "-c:a", "aac",  // Conversion systématique vers le codec audio universel AAC
    "-ac", "2",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  console.log(`[TRANSCODE] ${type}/${id} resolved=${located.url} — remuxing via ffmpeg`);
  const ff = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });

  ff.stderr.on("data", (d) => {
    const s = String(d).trim();
    if (s) console.log(`[TRANSCODE] ${type}/${id} ffmpeg: ${s}`);
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
    },
  });
}
