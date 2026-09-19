"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useSeries } from "@/lib/hooks";

function HomeContent() {
  const { data: series = [] } = useSeries();

  return (
    <div className="space-y-6">
      <TopBar title="Accueil" />

      {/* Rendu dynamique du catalogue avec ton composant d'origine */}
      <CatalogBrowser
        sectionKey="home"
        categories={[]}
        useItems={() => ({ data: series, isLoading: false })}
        toPoster={(item: any) => ({
          id: item.series_id || item.stream_id,
          name: item.name,
          poster: item.cover || item.stream_icon,
          rating: item.rating,
          year: item.releaseDate,
        })}
        hrefFor={(item: any) =>
          item.series_id ? `/series/${item.series_id}` : `/movies/${item.stream_id}`
        }
      />
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rend 0 Mo sur Cloudflare Workers lors du build/SSR (Anti-1102)
  if (!mounted) {
    return <PageSkeleton />;
  }

  return <HomeContent />;
}
