"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { FeaturedTile, NavTile, ContinueTile } from "@/components/catalog/Bento";
import { LivePreviewTile } from "@/components/catalog/LivePreviewTile";
import { type HeroItem } from "@/components/catalog/Hero";
import { Shelf } from "@/components/catalog/Shelf";
import { PosterCard } from "@/components/catalog/PosterCard";
import { PosterSkeletonRow, Skeleton } from "@/components/ui/Skeleton";
import { useVodCategories, useSeriesCategories, useVodStreams, useSeriesList } from "@/lib/hooks";
import { useLibrary, continueWatching } from "@/store/library";
import { sortItems, yearFrom, ratingNum, cleanName } from "@/lib/utils";
import { useTranslation } from "@/lib/useTranslation";
import { Play, Info, Star } from "lucide-react";

const CARD = "w-[140px] shrink-0 sm:w-[165px]";

// NOUVEAU COMPOSANT : LE BANNER CINÉMATIQUE (Façon Netflix/Prime)
function MainHeroBanner({ item }: { item: HeroItem & { tmdbId?: string } }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    const titleWithoutYear = item.title.replace(/\s*\(\d{4}\)\s*/g, "").replace(/\s*[-|]\s*\b(19|20)\d{2}\b/g, "").trim();
    
    let isMounted = true;
    fetch(`/api/tmdb-logo?tmdbId=${item.tmdbId || ""}&title=${encodeURIComponent(titleWithoutYear)}&type=tv`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.logoUrl) setLogoUrl(data.logoUrl);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [item]);

  if (!item) return null;

  return (
    <div className="relative mb-8 flex h-[60vh] min-h-[400px] w-full items-end overflow-hidden sm:h-[70vh] sm:min-h-[500px] sm:rounded-b-[3rem]">
      {/* Background Image & Gradients */}
      <div className="absolute inset-0 z-0">
        <img src={item.backdrop} alt={item.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10]/90 via-[#0b0c10]/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl px-5 pb-10 sm:px-12 sm:pb-16">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={item.title} 
            className="mb-6 h-20 object-contain sm:h-32 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-4 duration-1000" 
          />
        ) : (
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-6xl drop-shadow-lg">
            {cleanName(item.title)}
          </h1>
        )}

        <div className="mb-4 flex items-center gap-3 text-xs font-semibold sm:text-sm">
          {item.rating && (
            <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-amber-400 backdrop-blur-md">
              <Star className="h-3.5 w-3.5 fill-current" /> {item.rating.toFixed(1)}
            </span>
          )}
          {item.year && <span className="text-zinc-300">{item.year}</span>}
          {item.meta && <span className="text-zinc-400">&bull; {item.meta}</span>}
        </div>

        {item.plot && (
          <p className="mb-6 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            {item.plot}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Link
            href={item.playHref || item.detailHref}
            className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-black transition-transform hover:scale-105 active:scale-95"
          >
            <Play className="h-5 w-5 fill-current" /> Lecture
          </Link>
          <Link
            href={item.detailHref}
            className="flex items-center gap-2 rounded-xl bg-white/20 px-6 py-3 font-bold text-white backdrop-blur-md transition-colors hover:bg-white/30 active:scale-95"
          >
            <Info className="h-5 w-5" /> Plus d'infos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const { t } = useTranslation();
  const vodCats = useVodCategories();
  const seriesCats = useSeriesCategories();
  const { progress } = useLibrary();
  const cw = useMemo(() => continueWatching(progress), [progress]);

  const heroCatId = seriesCats.data?.[0]?.category_id;
  const heroSeries = useSeriesList(heroCatId);

  const heroItems = useMemo(() => {
    const withArt = (heroSeries.data ?? []).filter((s) => s.backdrop_path?.length || s.cover);
    return sortItems(withArt, "rating")
      .slice(0, 6)
      .map((s) => ({
        id: `s-${s.series_id}`,
        title: s.name,
        tmdbId: s.tmdb_id, // Ajout du tmdbId pour le logo
        backdrop: s.backdrop_path?.[0] || s.cover,
        plot: s.plot,
        rating: ratingNum(s.rating) || undefined,
        year: yearFrom(s.releaseDate, s.release_date, s.name),
        meta: s.genre,
        detailHref: `/series/${s.series_id}`,
        playHref: `/series/${s.series_id}`,
      }));
  }, [heroSeries.data]);

  const shelves = useMemo(() => {
    const m = (vodCats.data ?? []).slice(0, 6).map((c) => ({ kind: "movie" as const, cat: c }));
    const s = (seriesCats.data ?? []).slice(0, 5).map((c) => ({ kind: "series" as const, cat: c }));
    const out: Array<{ kind: "movie" | "series"; cat: { category_id: string; category_name: string } }> = [];
    for (let i = 0; i < Math.max(m.length, s.length); i++) {
      if (m[i]) out.push(m[i]);
      if (s[i]) out.push(s[i]);
    }
    return out;
  }, [vodCats.data, seriesCats.data]);

  const heroLoading = seriesCats.isLoading || heroSeries.isLoading;
  const mainFeaturedItem = heroItems[0]; // On prend la meilleure série pour le gros banner

  return (
    <div className="bg-[#0b0c10] min-h-screen text-white pb-10">
      <TopBar title="G-Player" />

      {/* BANNER HÉROÏQUE SI DISPONIBLE */}
      {heroLoading ? (
        <div className="h-[60vh] w-full animate-pulse bg-white/5 sm:rounded-b-[3rem] mb-8" />
      ) : mainFeaturedItem ? (
        <MainHeroBanner item={mainFeaturedItem as any} />
      ) : (
        <div className="pt-24" /> // Espace de secours si aucun contenu
      )}

      <div className="space-y-8 px-5 sm:px-8 relative z-10 -mt-10 sm:-mt-16">
        {/* BENTO MOSAIC (Navigation rapide) */}
        <div className="grid auto-rows-[168px] grid-cols-2 gap-4 lg:grid-cols-6 drop-shadow-2xl">
          {heroLoading ? (
            <Skeleton className="col-span-2 row-span-2 rounded-3xl lg:col-span-4 bg-white/5" />
          ) : (
            <FeaturedTile items={heroItems.slice(1)} className="col-span-2 row-span-2 lg:col-span-4" />
          )}

          {cw.length > 0 ? (
            <ContinueTile items={cw} className="col-span-2 row-span-1 lg:col-span-2" />
          ) : (
            <NavTile
              href="/movies"
              title={t("Home.movies")}
              subtitle={t("Home.browseMovies")}
              icon="film"
              tint="iris"
              className="col-span-2 row-span-1 lg:col-span-2 border border-white/5"
            />
          )}

          <LivePreviewTile className="col-span-1 row-span-1 border border-white/5" />
          <NavTile href="/favourites" title={t("Home.myList")} subtitle={t("Home.savedLater")} icon="heart" tint="iris" className="col-span-1 row-span-1 border border-white/5" />
        </div>
      </div>

      {/* BROWSE SHELVES */}
      <div className="space-y-9 pt-12">
        {(vodCats.isLoading || seriesCats.isLoading) && (
          <>
            <ShelfSkeleton />
            <ShelfSkeleton />
          </>
        )}
        {shelves.map(({ kind, cat }) => (
          <CategoryShelf key={`${kind}-${cat.category_id}`} kind={kind} catId={cat.category_id} title={cat.category_name} />
        ))}
      </div>
    </div>
  );
}

function CategoryShelf({ kind, catId, title }: { kind: "movie" | "series"; catId: string; title: string }) {
  const movies = useVodStreams(kind === "movie" ? catId : undefined, kind === "movie");
  const series = useSeriesList(kind === "series" ? catId : undefined, kind === "series");
  const q = kind === "movie" ? movies : series;

  if (q.isLoading) return <ShelfSkeleton title={title} />;

  if (kind === "movie") {
    const items = sortItems(movies.data ?? [], "added").slice(0, 20);
    if (items.length === 0) return null;
    return (
      <Shelf title={title}>
        {items.map((m) => (
          <PosterCard
            key={m.stream_id}
            className={CARD}
            item={{ id: m.stream_id, name: m.name, poster: m.stream_icon, rating: m.rating, year: yearFrom(m.name) }}
            href={`/movies/${m.stream_id}`}
          />
        ))}
      </Shelf>
    );
  }

  const items = sortItems(series.data ?? [], "added").slice(0, 20);
  if (items.length === 0) return null;
  return (
    <Shelf title={title}>
      {items.map((s) => (
        <PosterCard
          key={s.series_id}
          className={CARD}
          item={{ id: s.series_id, name: s.name, poster: s.cover, rating: s.rating, year: yearFrom(s.releaseDate, s.name) }}
          href={`/series/${s.series_id}`}
        />
      ))}
    </Shelf>
  );
}

function ShelfSkeleton({ title }: { title?: string }) {
  return (
    <section>
      <div className="mb-3 px-5 sm:px-8">
        {title ? <h2 className="text-xl font-bold text-white">{title}</h2> : <Skeleton className="h-6 w-40 bg-white/5" />}
      </div>
      <PosterSkeletonRow />
    </section>
  );
}
