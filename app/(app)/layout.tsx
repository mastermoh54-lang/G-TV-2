"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { Aurora } from "@/components/ui/Aurora";
import { CatalogWarmer } from "@/components/CatalogWarmer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Vérification de la session dans le navigateur
    const rawAuth = localStorage.getItem("gtv_auth") || localStorage.getItem("xtream_session");
    if (!rawAuth) {
      router.replace("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Pendant la vérification ou la redirection client, on affiche une mise en page vide
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-dvh bg-ink-950">
        <Aurora />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Aurora />
      <CatalogWarmer />
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
