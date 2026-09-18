import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let tmdbId = searchParams.get("tmdbId");
    const title = searchParams.get("title");
    const type = searchParams.get("type") || "tv"; // "tv" ou "movie"

    const TMDB_KEY = process.env.TMDB_API_KEY;
    const FANART_KEY = process.env.FANART_API_KEY;

    if (!TMDB_KEY) {
      return NextResponse.json({ logoUrl: null });
    }

    // 1. RECHERCHE DE SECOURS : Si l'IPTV n'a pas fourni de TMDB ID, on le cherche par le titre
    if (!tmdbId || tmdbId === "0" || tmdbId === "") {
      if (!title) return NextResponse.json({ logoUrl: null });
      
      const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}`;
      const searchRes = await fetch(searchUrl);
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          tmdbId = searchData.results[0].id.toString();
        } else {
          return NextResponse.json({ logoUrl: null });
        }
      } else {
        return NextResponse.json({ logoUrl: null });
      }
    }

    // 2. TENTATIVE VIA FANART.TV (Haute qualité)
    if (FANART_KEY && tmdbId) {
      try {
        const fanartUrl = type === "movie"
          ? `https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${FANART_KEY}`
          : `https://webservice.fanart.tv/v3/tv/${tmdbId}?api_key=${FANART_KEY}`;

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
            return NextResponse.json({ logoUrl: bestLogo.url });
          }
        }
      } catch (e) {
        // Échec silencieux, on passe au plan B
      }
    }

    // 3. PLAN B : VIA THEMOVIEDB (indispensable)
    if (tmdbId) {
      // include_image_language est vital pour que TMDB accepte d'envoyer les logos internationaux
      const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${TMDB_KEY}&include_image_language=fr,en,null`;
      const tmdbRes = await fetch(tmdbUrl);
      
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        const logos = tmdbData.logos || [];

        if (logos.length > 0) {
          const bestLogo = logos.find((l: any) => l.iso_639_1 === 'fr') 
                        || logos.find((l: any) => l.iso_639_1 === 'en') 
                        || logos[0];
          
          if (bestLogo) {
            return NextResponse.json({ logoUrl: `https://image.tmdb.org/t/p/w500${bestLogo.file_path}` });
          }
        }
      }
    }

    return NextResponse.json({ logoUrl: null });
  } catch (error) {
    return NextResponse.json({ logoUrl: null });
  }
}
