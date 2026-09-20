"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/TopBar";
import { Hero, type HeroItem } from "@/components/catalog/Hero";
import { Shelf } from "@/components/catalog/Shelf";
import { PosterCard } from "@/components/catalog/PosterCard";
import { api } from "@/lib/api";

export default function HomePage() {
  const movies = useQuery({ queryKey: ["vod", "streams", "all"], queryFn: () => api.vodStreams() });
  const series = useQuery({ queryKey: ["series", "list", "all"], queryFn: () => api.series() });

  const recentMovies = useMemo(() => (
    Array.isArray(movies.data)
      ? [...movies.data].sort((a, b) => Number(b.added || 0) - Number(a.added || 0)).slice(0, 20)
      : []
  ), [movies.data]);
  const popularSeries = useMemo(() => (
    Array.isArray(series.data)
      ? [...series.data].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 20)
      : []
  ), [series.data]);
  const heroItems: HeroItem[] = recentMovies.slice(0, 5).map((movie) => ({
    id: String(movie.stream_id),
    title: movie.name,
    backdrop: movie.stream_icon,
    rating: Number(movie.rating) || undefined,
    detailHref: `/movies/${movie.stream_id}`,
    playHref: `/watch?${new URLSearchParams({
      type: "movie",
      id: String(movie.stream_id),
      ext: movie.container_extension || "mp4",
      title: movie.name,
    })}`,
  }));

  return (
    <div className="space-y-8 pb-12">
      <TopBar title="Accueil" />
      <Hero items={heroItems} />
      <div className="space-y-6">
        <Shelf title="Récemment ajoutés">
          {movies.isPending ? (
            <p role="status" className="text-fog-300">Chargement des films…</p>
          ) : movies.isError ? (
            <div role="alert" className="text-fog-300">
              <p>Impossible de charger les films.</p>
              <button onClick={() => movies.refetch()} className="mt-2 underline">Réessayer</button>
            </div>
          ) : recentMovies.length === 0 ? (
            <p className="text-fog-300">Aucun film disponible.</p>
          ) : recentMovies.map((movie) => (
            <PosterCard key={movie.stream_id} item={movie} href={`/movies/${movie.stream_id}`} className="w-36 shrink-0 sm:w-44" />
          ))}
        </Shelf>
        <Shelf title="Séries populaires">
          {series.isPending ? (
            <p role="status" className="text-fog-300">Chargement des séries…</p>
          ) : series.isError ? (
            <div role="alert" className="text-fog-300">
              <p>Impossible de charger les séries.</p>
              <button onClick={() => series.refetch()} className="mt-2 underline">Réessayer</button>
            </div>
          ) : popularSeries.length === 0 ? (
            <p className="text-fog-300">Aucune série disponible.</p>
          ) : popularSeries.map((show) => (
            <PosterCard key={show.series_id} item={show} href={`/series/${show.series_id}`} className="w-36 shrink-0 sm:w-44" />
          ))}
        </Shelf>
      </div>
    </div>
  );
}
