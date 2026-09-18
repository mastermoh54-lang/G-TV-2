import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let tmdbId = searchParams.get("tmdbId");
    let title = searchParams.get("title") || "";
    const type = searchParams.get("type") || "tv"; 

    const TMDB_KEY = process.env.TMDB_API_KEY;
    const FANART_KEY = process.env.FANART_API_KEY;

    if (!TMDB_KEY) return NextResponse.json({ logoUrl: null });

    // NETTOYAGE ULTRA-AGRESSIF DU TITRE (Enlève |MULTI|, [FR], (2026), - 2023 -, Saison 1...)
    const cleanTitle = title
      .replace(/\|.*?\|/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\s*[-|]\s*\b(19|20)\d{2}\b/g, "") // <- Le filtre pour les tirets et l'année !
      .replace(/Saison \d+/gi, "")
      .replace(/Season \d+/gi, "")
      .trim();

    let finalTmdbId = null;
    let finalTvdbId = null;

    if (tmdbId && tmdbId !== "0" && tmdbId !== "null" && tmdbId !== "") {
      const verifyRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`);
      if (verifyRes.ok) {
        const extData = await verifyRes.json();
        finalTmdbId = tmdbId; 
        if (type === "tv" && extData.tvdb_id) {
          finalTvdbId = extData.tvdb_id.toString(); 
        }
      }
    }

    if (!finalTmdbId && cleanTitle) {
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          finalTmdbId = searchData.results[0].id.toString();
          
          if (type === "tv") {
            const extRes = await fetch(`https://api.themoviedb.org/3/tv/${finalTmdbId}/external_ids?api_key=${TMDB_KEY}`);
            if (extRes.ok) {
              const extData = await extRes.json();
              if (extData.tvdb_id) finalTvdbId = extData.tvdb_id.toString();
            }
          }
        }
      }
    }

    if (!finalTmdbId) return NextResponse.json({ logoUrl: null });

    if (FANART_KEY) {
      try {
        const fanartUrl = type === "movie"
          ? `https://webservice.fanart.tv/v3/movies/${finalTmdbId}?api_key=${FANART_KEY}`
          : (finalTvdbId ? `https://webservice.fanart.tv/v3/tv/${finalTvdbId}?api_key=${FANART_KEY}` : null);

        if (fanartUrl) {
          const fanartRes = await fetch(fanartUrl);
          if (fanartRes.ok) {
            const fanartData = await fanartRes.json();
            const logos = type === "movie" 
              ? (fanartData.hdmovielogo || fanartData.movielogo || [])
              : (fanartData.hdtvlogo || fanartData.clearlogo || []);

            if (logos.length > 0) {
              const bestLogo = logos.find((l: any) => l.lang === 'fr') 
                            || logos.find((l: any) => l.lang === 'en') 
                            || logos[0];
              if (bestLogo?.url) return NextResponse.json({ logoUrl: bestLogo.url });
            }
          }
        }
      } catch (e) {}
    }

    const tmdbUrl = `https://api.themoviedb.org/3/${type}/${finalTmdbId}/images?api_key=${TMDB_KEY}&include_image_language=en,fr,null`;
    const tmdbRes = await fetch(tmdbUrl);
    
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      const logos = tmdbData.logos || [];

      if (logos.length > 0) {
        const bestLogo = logos.find((l: any) => l.iso_639_1 === 'fr') 
                      || logos.find((l: any) => l.iso_639_1 === 'en') 
                      || logos[0];
        
        if (bestLogo?.file_path) {
          return NextResponse.json({ logoUrl: `https://image.tmdb.org/t/p/w500${bestLogo.file_path}` });
        }
      }
    }

    return NextResponse.json({ logoUrl: null });
  } catch (error) {
    return NextResponse.json({ logoUrl: null });
  }
}
