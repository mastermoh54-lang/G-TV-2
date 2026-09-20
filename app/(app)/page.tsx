"use client";

import React, { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
// Importe tes composants habituels de la page d'accueil ici (Catalog, Hero, etc.)

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
      {/* Insère ici le contenu principal de ta page d'accueil */}
    </main>
  );
}
