"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { LiveBrowser } from "@/components/catalog/LiveBrowser";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function LivePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rend 0 Mo de RAM côté serveur Cloudflare pour bloquer l'Error 1102
  if (!mounted) {
    return <PageSkeleton />;
  }

  return (
    <>
      <TopBar title="Live TV" />
      <LiveBrowser />
    </>
  );
}
