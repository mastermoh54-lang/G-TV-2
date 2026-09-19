import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const media = searchParams.get("media") || "movie";
  const slot = searchParams.get("slot");

  // URL de l'AdServer récupérée dynamiquement depuis les variables Vercel
  const baseUrl = process.env.PHP_ADSERVER_URL || "http://gmz.page.gd/api.php";

  let phpApiUrl = `${baseUrl}?media=${media}`;
  if (slot) {
    phpApiUrl += `&slot=${slot}`;
  }

  try {
    const res = await fetch(phpApiUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ status: "empty", message: "AdServer indisponible" });
    }

    const data = await res.json();

    // Traitement dynamique de l'URL vidéo sans exposer le serveur
    if (data?.ad?.video_url && !data.ad.video_url.startsWith("http")) {
      data.ad.video_url = `https://gmz.page.gd/${data.ad.video_url.replace(/^\//, "")}`;
    }

    return NextResponse.json(data);
  } catch (error) {
    // Interception silencieuse : masque la trace d'erreur et évite le code HTTP 500
    return NextResponse.json({ status: "empty", message: "Erreur de connexion AdServer" });
  }
}
