"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { HeroBanner } from "@/components/catalog/HeroBanner";
import { MediaRow } from "@/components/catalog/MediaRow";
import { useMovies, useSeries } from "@/lib/hooks";

function HomeContent() {
  const { data: movies = [], isLoading: moviesLoading } = useMovies();
  const { data: series = [], isLoading: seriesLoading } = useSeries();

  return (
    <div className="space-y-8 pb-12">
      <TopBar title="Accueil" />
      <HeroBanner items={[...movies.slice(0, 5), ...series.slice(0, 5)]} />
      <MediaRow title="Films récents" items={movies.slice(0, 15)} type="movie" />
      <MediaRow title="Séries populaires" items={series.slice(0, 15)} type="series" />
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pendant le build / SSR Cloudflare : renvoie uniquement le Skeleton (0 Mo de RAM consommée)
  if (!mounted) {
    return <PageSkeleton />;
  }

  // Le rendu réel s'exécute uniquement dans le navigateur client
  return <HomeContent />;
}
