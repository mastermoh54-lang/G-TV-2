// app/api/stream/route.ts (branche gtv-railway)
import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Access-Control-Allow-Origin": "*",
};

async function checkUrl(url: string) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, "Range": "bytes=0-100" }
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    let creds: any = {};
    try {
      creds = (await requireSession()) as any;
    } catch {
      creds = {
        server: searchParams.get("server") || searchParams.get("host"),
        username: searchParams.get("username"),
        password: searchParams.get("password"),
      };
    }

    const rawType = searchParams.get("type") || "movie";
    const id = searchParams.get("id");
    const originalExt = searchParams.get("ext") || "mp4";
    const t = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

    if (!id) {
      return new Response("ID manquant", { status: 400, headers: NO_CACHE_HEADERS });
    }

    const rawHost = creds.baseUrl || creds.url || creds.serverUrl || creds.server || creds.host || searchParams.get("server") || "";
    const username = creds.username || creds.user || searchParams.get("username") || "";
    const password = creds.password || creds.pass || searchParams.get("password") || "";

    if (!rawHost || !username || !password) {
      return new Response("Paramètres de connexion manquants", { status: 400, headers: NO_CACHE_HEADERS });
    }

    const host = String(rawHost).replace(/\/+$/, "");
    const u = encodeURIComponent(username);
    const p = encodeURIComponent(password);

    // Détermination dynamique du dossier (movie ou series)
    const folder = rawType === "series" ? "series" : "movie";

    let inputUrl = `${host}/${folder}/${u}/${p}/${id}.${originalExt}`;
    console.log(`[STREAM] 🔍 Traitement (${folder}) : ${inputUrl}`);
    
    let isOk = await checkUrl(inputUrl);

    if (!isOk) {
      const fallbacks = ["mp4", "mkv", "avi", "ts"].filter(e => e !== originalExt);
      for (const altExt of fallbacks) {
        const altUrl = `${host}/${folder}/${u}/${p}/${id}.${altExt}`;
        if (await checkUrl(altUrl)) {
          inputUrl = altUrl;
          isOk = true;
          break;
        }
      }
    }

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

    const ff = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });

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
        ...NO_CACHE_HEADERS,
      },
    });
  } catch (err: any) {
    console.error("[STREAM] Crash total :", err);
    return new Response(`Erreur Stream: ${err.message}`, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
