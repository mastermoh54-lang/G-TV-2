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

    // NETTOYAGE INTELLIGENT DU TITRE
    const cleanTitle = title
      .replace(/\|.*?\|/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(\d{4}\)/g, "")
      .trim();

    let isTmdbIdValid = false;
    let tvdbId = null;

    // 1. VÉRIFIER LE TMDB_ID (Les fournisseurs IPTV envoient souvent de faux IDs pour les séries)
    if (tmdbId && tmdbId !== "0" && tmdbId !== "null" && tmdbId !== "") {
      // On teste l'ID pour voir s'il existe vraiment chez TMDB
      const verifyRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`);
      if (verifyRes.ok) {
        isTmdbIdValid = true;
        if (type === "tv") {
          const extData = await verifyRes.json();
          tvdbId = extData.tvdb_id; // Vital pour Fanart
        }
      }
    }

    // 2. RECHERCHE DE SECOURS (Si l'ID fourni par l'IPTV était faux ou manquant)
    if (!isTmdbIdValid && cleanTitle) {
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          tmdbId = searchData.results[0].id.toString();
          
          // Si c'est une série, on récupère le TVDB_ID pour Fanart
          if (type === "tv") {
            const extRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${TMDB_KEY}`);
            if (extRes.ok) {
              const extData = await extRes.json();
              tvdbId = extData.tvdb_id;
            }
          }
        }
      }
    }

    // Si on a toujours aucun ID valide, on abandonne
    if (!tmdbId || tmdbId === "0") return NextResponse.json({ logoUrl: null });

    // 3. TENTATIVE VIA FANART.TV
    if (FANART_KEY) {
      try {
        // Pour les séries, Fanart EXIGE le TVDB ID. Si on ne l'a pas, on ignore Fanart.
        if (type === "movie" || (type === "tv" && tvdbId)) {
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
              if (bestLogo?.url) {
                return NextResponse.json({ logoUrl: bestLogo.url });
              }
            }
          }
        }
      } catch (e) {
        // Échec Fanart, on continue silencieusement
      }
    }

    // 4. PLAN B : VIA THEMOVIEDB
    const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${TMDB_KEY}&include_image_language=fr,en,null`;
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
