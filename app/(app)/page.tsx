"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useMovies, useSeries } from "@/lib/hooks";

function HomeContent() {
  // Chargement des données côté client uniquement
  const { data: movies = [] } = useMovies();
  const { data: series = [] } = useSeries();

  return (
    <div className="space-y-6">
      <TopBar title="Accueil" />
      
      {/* Intégration de tes sections ou composants de présentation */}
      <div className="px-6 space-y-8">
        {/* Section Films */}
        {movies.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Films récents</h2>
            <CatalogBrowser items={movies.slice(0, 12)} type="movie" />
          </section>
        )}

        {/* Section Séries */}
        {series.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Séries populaires</h2>
            <CatalogBrowser items={series.slice(0, 12)} type="series" />
          </section>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pendant le SSR Cloudflare Worker : renvoie 0 Mo de charge mémoire
  if (!mounted) {
    return <PageSkeleton />;
  }

  // Rendu interactif côté navigateur
  return <HomeContent />;
}
