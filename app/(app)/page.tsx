"use client";

import { useState, useEffect } from "react";
import HomePageClient from "@/components/pages/HomePageClient";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rend 0 Mo sur Cloudflare Workers lors du build/SSR (Anti-1102)
  if (!mounted) {
    return <PageSkeleton />;
  }

  // Affiche ton composant complet une fois dans le navigateur
  return <HomePageClient />;
}
