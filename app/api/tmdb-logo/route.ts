import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    const type = searchParams.get("type") || "tv"; // "tv" ou "movie"

    const TMDB_KEY = process.env.TMDB_API_KEY;
    const FANART_KEY = process.env.FANART_API_KEY; // Ta nouvelle clé !

    if (!tmdbId) {
      return NextResponse.json({ logoUrl: null });
    }

    // 1. TENTATIVE VIA FANART.TV (La meilleure qualité)
    if (FANART_KEY) {
      try {
        const fanartUrl = type === "movie"
          ? `https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${FANART_KEY}`
          : `https://webservice.fanart.tv/v3/tv/${tmdbId}?api_key=${FANART_KEY}`;

        const fanartRes = await fetch(fanartUrl);
        if (fanartRes.ok) {
          const fanartData = await fanartRes.json();
          
          // Fanart nomme les listes de logos différemment pour les films et séries
          const logos = type === "movie" 
            ? (fanartData.hdmovielogo || fanartData.movielogo || [])
            : (fanartData.hdtvlogo || fanartData.clearlogo || []);

          if (logos.length > 0) {
            // Priorité au Français, puis Anglais, puis le premier dispo
            const bestLogo = logos.find((l: any) => l.lang === 'fr') 
                          || logos.find((l: any) => l.lang === 'en') 
                          || logos[0];
                          
            return NextResponse.json({ logoUrl: bestLogo.url });
          }
        }
      } catch (e) {
        console.log("Fanart introuvable, passage au plan B...");
      }
    }

    // 2. PLAN B : FALLBACK VIA TMDB (Si Fanart n'a rien trouvé)
    if (TMDB_KEY) {
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${TMDB_KEY}`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        const logos = tmdbData.logos || [];

        if (logos.length > 0) {
          const bestLogo = logos.find((l: any) => l.iso_639_1 === 'fr') 
                        || logos.find((l: any) => l.iso_639_1 === 'en') 
                        || logos[0];
          return NextResponse.json({ logoUrl: `https://image.tmdb.org/t/p/w500${bestLogo.file_path}` });
        }
      }
    }

    // Si vraiment rien n'est trouvé, on renvoie null (le front affichera le texte)
    return NextResponse.json({ logoUrl: null });
  } catch (error) {
    return NextResponse.json({ logoUrl: null });
  }
}
