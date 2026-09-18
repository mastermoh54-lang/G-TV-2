import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    const type = searchParams.get("type") || "tv"; // "tv" pour séries, "movie" pour films

    const TMDB_KEY = process.env.TMDB_API_KEY;

    if (!TMDB_KEY || !tmdbId) {
      return NextResponse.json({ logoUrl: null });
    }

    const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${TMDB_KEY}`);
    
    if (!res.ok) {
      return NextResponse.json({ logoUrl: null });
    }
    
    const data = await res.json();
    const logos = data.logos || [];

    if (logos.length > 0) {
      // Priorité 1: Français, Priorité 2: Anglais, Priorité 3: Le premier trouvé
      const bestLogo = logos.find((l: any) => l.iso_639_1 === 'fr') 
                    || logos.find((l: any) => l.iso_639_1 === 'en') 
                    || logos[0];
                  
      return NextResponse.json({ logoUrl: `https://image.tmdb.org/t/p/w500${bestLogo.file_path}` });
    }

    return NextResponse.json({ logoUrl: null });
  } catch (error) {
    return NextResponse.json({ logoUrl: null });
  }
}
