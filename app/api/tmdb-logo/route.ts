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

    // NETTOYAGE EXTREME DU TITRE (Enlève les |MULTI|, [FR], et les années comme (2026))
    const cleanTitle = title
      .replace(/\|.*?\|/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(\d{4}\)/g, "")
      .trim();

    // 1. RECHERCHE DE SECOURS TMDB (Si l'IPTV n'a pas donné d'ID)
    if (!tmdbId || tmdbId === "0" || tmdbId === "null" || tmdbId === "") {
      if (!cleanTitle) return NextResponse.json({ logoUrl: null });
      
      const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}`;
      const searchRes = await fetch(searchUrl);
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          tmdbId = searchData.results[0].id.toString();
        }
      }
    }

    if (!tmdbId || tmdbId === "0" || tmdbId === "null") {
      return NextResponse.json({ logoUrl: null });
    }

    // 2. LE TRADUCTEUR POUR FANART : Convertir TMDB_ID en TVDB_ID pour les séries
    let tvdbId = tmdbId;
    if (type === "tv") {
      const extRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${TMDB_KEY}`);
      if (extRes.ok) {
        const extData = await extRes.json();
        if (extData.tvdb_id) tvdbId = extData.tvdb_id.toString();
      }
    }

    // 3. TENTATIVE VIA FANART.TV (HD Clear Logos)
    if (FANART_KEY) {
      try {
        const fanartUrl = type === "movie"
          ? `https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${FANART_KEY}`
          : `https://webservice.fanart.tv/v3/tv/${tvdbId}?api_key=${FANART_KEY}`;

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
        // Fanart échoue ou n'a pas le logo, on passe au plan B sans faire planter l'appli
      }
    }

    // 4. PLAN B : VIA THEMOVIEDB (Les logos officiels)
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

    return NextResponse.json({ logoUrl: null });
  } catch (error) {
    return NextResponse.json({ logoUrl: null });
  }
}
