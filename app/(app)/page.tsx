"use client";

import { useState, useEffect } from "react";
import HomePageClient from "@/components/pages/HomePageClient";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageSkeleton />;
  }

  return <HomePageClient />;
}
