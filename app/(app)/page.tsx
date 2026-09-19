"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useSeries } from "@/lib/hooks";

function HomeContent() {
  // Récupération des séries via le hook existant
  const { data: series = [] } = useSeries();

  return (
    <div className="space-y-6">
      <TopBar title="Accueil" />
      
      <div className="px-6 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Séries populaires</h2>
          {series.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {series.slice(0, 12).map((item) => (
                <div key={item.series_id} className="relative group rounded-lg overflow-hidden bg-white/5 p-2">
                  <img
                    src={item.cover || "/placeholder.png"}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded"
                  />
                  <p className="mt-2 text-sm font-medium text-white truncate">{item.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-fog-400 text-sm">Chargement des contenus...</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rend 0 Mo sur Cloudflare Workers lors du build/SSR
  if (!mounted) {
    return <PageSkeleton />;
  }

  return <HomeContent />;
}
