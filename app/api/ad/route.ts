import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const media = searchParams.get("media") || "movie";
  const slot = searchParams.get("slot");

  // Récupération dynamique depuis les variables Vercel
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

    // S'assurer que le lien vidéo retourné est accessible en HTTPS si nécessaire
    if (data?.ad?.video_url && !data.ad.video_url.startsWith("http")) {
      data.ad.video_url = `https://gmz.page.gd/${data.ad.video_url.replace(/^\//, "")}`;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur Proxy AdServer :", error);
    return NextResponse.json({ status: "empty", message: "Erreur de connexion AdServer" });
  }
}
