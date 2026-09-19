"use client";

import { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

// REMPLACE CE BLOC PAR LE CODE ORIGINAL DE TA PAGE HOME (JSX + HOOKS)
function HomeContent() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold">Accueil</h1>
      {/* Colle ici tes composants d'accueil d'origine */}
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageSkeleton />;
  }

  return <HomeContent />;
}
