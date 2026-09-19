"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useSeriesCategories, useSeries } from "@/lib/hooks";
import type { Series } from "@/lib/xtream/types";

function SeriesCatalogContent() {
  const { data: categories = [] } = useSeriesCategories();

  return (
    <>
      <TopBar title="Séries" />
      <CatalogBrowser<Series>
        sectionKey="series"
        categories={categories}
        useItems={(catId) => useSeries(catId)}
        toPoster={(item) => ({
          id: item.series_id,
          name: item.name,
          poster: item.cover,
          rating: item.rating,
          year: item.releaseDate,
        })}
        hrefFor={(item) => `/series/${item.series_id}`}
      />
    </>
  );
}

export default function SeriesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sur le serveur Cloudflare, on renvoie uniquement le Skeleton (0 Mo de RAM consommée)
  if (!mounted) {
    return <PageSkeleton />;
  }

  // Le chargement de la liste des séries s'exécute exclusivement dans le navigateur client
  return <SeriesCatalogContent />;
}
