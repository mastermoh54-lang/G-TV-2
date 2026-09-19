import React, { useState, useRef, useEffect } from "react";

interface VideoPlayerProps {
  mainVideoUrl: string;
  isLive?: boolean;
  ext?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ mainVideoUrl, isLive, ext }) => {
  const [adVideoUrl, setAdVideoUrl] = useState<string | null>(null);
  const [isPlayingAd, setIsPlayingAd] = useState<boolean>(false);
  const [adDuration, setAdDuration] = useState<number>(0);
  const [adCurrentTime, setAdCurrentTime] = useState<number>(0);

  const adVideoRef = useRef<HTMLVideoElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasFetchedAdRef = useRef<boolean>(false);

  const currentMedia = isLive ? "live" : (ext === "series" ? "series" : "movie");

  // Fetch de l'AdServer
  useEffect(() => {
    if (hasFetchedAdRef.current) return;

    const fetchAd = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_ADSERVER_API;
      if (!apiUrl) return;

      hasFetchedAdRef.current = true;

      try {
        const response = await fetch(`${apiUrl}?slot=Pre-Roll&media=${currentMedia}`);
        const data = await response.json();

        if (data.status === "success" && data.ad && data.ad.video_url) {
          let fullAdUrl = data.ad.video_url;
          if (!fullAdUrl.startsWith("http")) {
            const apiBaseDomain = new URL(apiUrl).origin;
            fullAdUrl = `${apiBaseDomain}/${fullAdUrl.replace(/^\//, "")}`;
          }
          setAdVideoUrl(fullAdUrl);
          setIsPlayingAd(true);
        } else {
          setIsPlayingAd(false);
        }
      } catch (err) {
        console.error("Erreur AdServer :", err);
        setIsPlayingAd(false);
      }
    };

    fetchAd();
  }, [currentMedia]);

  // Gestion des événements de la vidéo pub
  const handleAdLoadedMetadata = () => {
    if (adVideoRef.current) {
      setAdDuration(Math.floor(adVideoRef.current.duration));
    }
  };

  const handleAdTimeUpdate = () => {
    if (adVideoRef.current) {
      setAdCurrentTime(Math.floor(adVideoRef.current.currentTime));
    }
  };

  const handleAdEnded = () => {
    setIsPlayingAd(false);
    if (mainVideoRef.current) {
      mainVideoRef.current.play();
    }
  };

  // Formatage du temps restant (ex: 0:15)
  const remainingTime = Math.max(0, adDuration - adCurrentTime);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-2xl group">
      {isPlayingAd && adVideoUrl ? (
        <div className="relative w-full h-full">
          <video
            ref={adVideoRef}
            src={adVideoUrl}
            autoPlay
            playsInline
            onLoadedMetadata={handleAdLoadedMetadata}
            onTimeUpdate={handleAdTimeUpdate}
            onEnded={handleAdEnded}
            className="w-full h-full object-contain"
          />

          {/* Badge Style Amazon Prime Video */}
          <div className="absolute bottom-8 left-8 flex items-center space-x-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-white font-sans text-sm font-semibold tracking-wide shadow-2xl pointer-events-none select-none">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span>Publicité</span>
            <span class="text-zinc-400">•</span>
            <span className="font-mono text-amber-400">{formatTime(remainingTime)}</span>
          </div>
        </div>
      ) : (
        <video
          ref={mainVideoRef}
          src={mainVideoUrl}
          controls
          autoPlay={!isPlayingAd}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
};
