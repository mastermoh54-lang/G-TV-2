"use client";

import { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import HomeContent from "@/components/home/HomeContent"; // Assure-toi que le chemin vers ton composant d'accueil est correct

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pendant la génération sur Cloudflare Worker, renvoie uniquement le Skeleton (0 Mo de RAM)
  if (!mounted) {
    return <PageSkeleton />;
  }

  // Le contenu principal se charge uniquement dans le navigateur
  return <HomeContent />;
}
