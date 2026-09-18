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

    // Nettoyage au cas où on doive chercher par le texte en dernier recours
    const cleanTitle = title
      .replace(/\|.*?\|/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\s*[-|]\s*\b(19|20)\d{2}\b/g, "")
      .replace(/Saison \d+/gi, "")
      .replace(/Season \d+/gi, "")
      .trim();

    let finalTmdbId = tmdbId;
    let tmdbLogoUrl = null;
    let fanartLogoUrl = null;

    // ÉTAPE 1 : ON FAIT CONFIANCE À L'ID FOURNI ET ON CHERCHE DIRECTEMENT SUR TMDB
    if (finalTmdbId && finalTmdbId !== "0" && finalTmdbId !== "null") {
      const tmdbImagesUrl = `https://api.themoviedb.org/3/${type}/${finalTmdbId}/images?api_key=${TMDB_KEY}&include_image_language=fr,en,null`;
      const tmdbRes = await fetch(tmdbImagesUrl);
      
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        if (data.logos && data.logos.length > 0) {
          const best = data.logos.find((l: any) => l.iso_639_1 === 'fr') || data.logos.find((l: any) => l.iso_639_1 === 'en') || data.logos[0];
          tmdbLogoUrl = `https://image.tmdb.org/t/p/w500${best.file_path}`;
        }
      } else {
        // L'ID était faux, on le réinitialise pour passer à l'étape 2
        finalTmdbId = null;
      }
    }

    // ÉTAPE 2 : RECHERCHE PAR TITRE UNIQUEMENT SI L'ID ÉTAIT FAUX OU MANQUANT
    if (!finalTmdbId && cleanTitle) {
      const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}`;
      const searchRes = await fetch(searchUrl);
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          finalTmdbId = searchData.results[0].id.toString();
          
          // On relance la recherche d'images pour ce nouvel ID
          const tmdbImagesUrl = `https://api.themoviedb.org/3/${type}/${finalTmdbId}/images?api_key=${TMDB_KEY}&include_image_language=fr,en,null`;
          const tmdbRes2 = await fetch(tmdbImagesUrl);
          if (tmdbRes2.ok) {
            const data2 = await tmdbRes2.json();
            if (data2.logos && data2.logos.length > 0) {
              const best = data2.logos.find((l: any) => l.iso_639_1 === 'fr') || data2.logos.find((l: any) => l.iso_639_1 === 'en') || data2.logos[0];
              tmdbLogoUrl = `https://image.tmdb.org/t/p/w500${best.file_path}`;
            }
          }
        }
      }
    }

    // ÉTAPE 3 : ON A MAINTENANT UN ID VALIDE. ON TENTE D'AVOIR UN LOGO ENCORE MEILLEUR SUR FANART !
    if (finalTmdbId && FANART_KEY) {
      let fanartQueryId = finalTmdbId;
      
      // Pour les séries, Fanart veut le TVDB ID. On essaie de le traduire.
      if (type === "tv") {
        const extRes = await fetch(`https://api.themoviedb.org/3/tv/${finalTmdbId}/external_ids?api_key=${TMDB_KEY}`);
        if (extRes.ok) {
          const extData = await extRes.json();
          if (extData.tvdb_id) fanartQueryId = extData.tvdb_id.toString();
        }
      }
      
      try {
        const fanartUrl = type === "movie" 
            ? `https://webservice.fanart.tv/v3/movies/${fanartQueryId}?api_key=${FANART_KEY}` 
            : `https://webservice.fanart.tv/v3/tv/${fanartQueryId}?api_key=${FANART_KEY}`;
        
        const fanartRes = await fetch(fanartUrl);
        if (fanartRes.ok) {
          const fData = await fanartRes.json();
          const logos = type === "movie" 
              ? (fData.hdmovielogo || fData.movielogo || []) 
              : (fData.hdtvlogo || fData.clearlogo || []);
              
          if (logos.length > 0) {
            const best = logos.find((l: any) => l.lang === 'fr') || logos.find((l: any) => l.lang === 'en') || logos[0];
            fanartLogoUrl = best.url;
          }
        }
      } catch (e) {
        // Fanart échoue, ce n'est pas grave, on a déjà TMDB de côté !
      }
    }

    // ÉTAPE FINALE : On renvoie Fanart (Le plus beau), sinon TMDB (Très bien), sinon null (Texte)
    return NextResponse.json({ logoUrl: fanartLogoUrl || tmdbLogoUrl || null });
    
  } catch (error) {
    return NextResponse.json({ logoUrl: null });
  }
}
