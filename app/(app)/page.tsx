"use client";

import { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { TopBar } from "@/components/layout/TopBar";
import { Hero } from "@/components/catalog/Hero";
import { Shelf } from "@/components/catalog/Shelf";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8 pb-12">
      <TopBar title="Accueil" />
      <Hero />
      <div className="space-y-6 px-4 sm:px-8">
        <Shelf title="Récemment ajoutés" type="movie" />
        <Shelf title="Séries populaires" type="series" />
      </div>
    </div>
  );
}
