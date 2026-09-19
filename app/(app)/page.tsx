"use client";

import { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

// --- GARDER TOUS TES IMPORTS ORIGINAUX ICI SANS LES CHANGER ---
// (Exemple : TopBar, tes hooks, tes composants existants, etc.)

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Pendant la compilation / SSR Cloudflare : renvoie uniquement le Skeleton (0 Mo de RAM)
  if (!mounted) {
    return <PageSkeleton />;
  }

  // 2. RECOLLER ICI LE RESTE DU CODE/JSX ORIGINAL DE TA PAGE HOME
  return (
    <div>
      {/* Ton JSX d'accueil d'origine */}
    </div>
  );
}
