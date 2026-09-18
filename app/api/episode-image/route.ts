import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    const season = searchParams.get("season");
    const episode = searchParams.get("episode");

    const TMDB_KEY = process.env.TMDB_API_KEY;

    // Si on n'a pas de clé TMDB ou qu'il manque des infos, on renvoie "null" en succès (évite l'erreur 404 rouge)
    if (!TMDB_KEY || !tmdbId || !season || !episode) {
      return NextResponse.json({ imageUrl: null });
    }

    // Requête vers l'API TMDB pour récupérer l'image exacte de l'épisode
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_KEY}`);
    
    if (!res.ok) {
      return NextResponse.json({ imageUrl: null });
    }
    
    const data = await res.json();
    
    if (data.still_path) {
      return NextResponse.json({ imageUrl: `https://image.tmdb.org/t/p/w500${data.still_path}` });
    }

    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    return NextResponse.json({ imageUrl: null });
  }
}
