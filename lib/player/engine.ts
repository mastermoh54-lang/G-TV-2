// Picks the right playback strategy for a stream and wires it to a <video>.
// Live/HLS (.m3u8) → hls.js · mp4/mkv → native

export type EngineKind = "mpegts" | "hls" | "native" | "unsupported";

export interface EngineHandle {
  kind: EngineKind;
  destroy: () => void;
}

const NATIVE_OK = ["mp4", "m4v", "mov", "webm", "ogg"];
const RISKY = ["mkv", "avi", "wmv", "flv"];

export function pickEngine(url: string, ext: string, isLive: boolean): EngineKind {
  const u = url.toLowerCase();
  const e = ext.toLowerCase().replace(/^\./, "");

  // 1. Si c'est un Live ou un manifeste m3u8, on utilise TOUJOURS hls.js
  if (isLive || e === "m3u8" || u.includes("ext=m3u8") || u.includes("/api/hls") || /\.m3u8(\?|$)/.test(u)) {
    return "hls";
  }

  // 2. Si l'extension demande explicitement du TS binaire hors Live
  if (e === "ts") {
    return "mpegts";
  }

  // 3. VOD (Films & Séries - MP4 / MKV) -> Native HTML5
  if (NATIVE_OK.includes(e) || RISKY.includes(e)) {
    return "native";
  }

  return "native";
}

export async function attach(
  video: HTMLVideoElement,
  opts: { url: string; ext: string; isLive: boolean },
): Promise<EngineHandle> {
  const kind = pickEngine(opts.url, opts.ext, opts.isLive);

  // GESTION HLS (Live TV & Manifestes .m3u8)
  if (kind === "hls") {
    const Hls = (await import("hls.js")).default;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 500,
        ...(opts.isLive ? { liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 10 } : {}),
      });

      // Auto-récupération des erreurs réseau et média
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
        }
      });

      hls.loadSource(opts.url);
      hls.attachMedia(video);
      return { kind: "hls", destroy: () => hls.destroy() };
    }

    // Fallback Safari iOS natif pour HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = opts.url;
      return { kind: "native", destroy: () => void (video.src = "") };
    }

    video.src = opts.url;
    return { kind: "native", destroy: () => void (video.src = "") };
  }

  // GESTION MPEGTS (Uniquement si explicitement demandé en .ts binaire)
  if (kind === "mpegts") {
    const mpegts = (await import("mpegts.js")).default;
    if (mpegts.getFeatureList().mseLivePlayback || mpegts.isSupported()) {
      const player = mpegts.createPlayer(
        { type: "mpegts", isLive: opts.isLive, url: opts.url },
        {
          enableStashBuffer: false,
          stashInitialSize: 128,
          lazyLoad: false,
          liveBufferLatencyChasing: opts.isLive,
          liveBufferLatencyChasingOnPaused: false,
          liveBufferLatencyMaxLatency: 3.0,
          liveBufferLatencyMinRemain: 0.5,
          autoCleanupSourceBuffer: true,
        },
      );
      player.attachMediaElement(video);
      player.load();
      return {
        kind: "mpegts",
        destroy: () => {
          try {
            player.destroy();
          } catch {}
        },
      };
    }
    video.src = opts.url;
    return { kind: "native", destroy: () => void (video.src = "") };
  }

  // GESTION NATIVE (Films et Séries en .mp4 / .mkv)
  video.src = opts.url;
  return { kind: "native", destroy: () => void (video.src = "") };
}
