"use client";

import React, { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
// Importe tes composants de page d'accueil ici (ex: Hero, CatalogRows, etc.)

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageSkeleton />;
  }

  return (
    <main className="min-h-screen text-white">
      {/* Contenu de ta page d'accueil */}
    </main>
  );
}
