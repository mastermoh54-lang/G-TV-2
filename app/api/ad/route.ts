import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const media = searchParams.get("media") || "movie";
  const slot = searchParams.get("slot");

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

    // 1. Récupération du texte brut (incluant le HTML parasite)
    const rawText = await res.text();

    // 2. Extraction dynamique du bloc JSON situé entre { et }
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ status: "empty", message: "Format JSON introuvable" });
    }

    // 3. Conversion du JSON nettoyé
    const data = JSON.parse(jsonMatch[0]);

    // 4. Normalisation de l'URL vidéo HTTPS
    if (data?.ad?.video_url) {
      let rawUrl = data.ad.video_url;
      if (!rawUrl.startsWith("http")) {
        rawUrl = `https://gmz.page.gd/${rawUrl.replace(/^\//, "")}`;
      } else {
        rawUrl = rawUrl.replace(/^http:\/\//i, "https://");
      }
      data.ad.video_url = rawUrl;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ status: "empty", message: "Erreur lors du traitement de l'AdServer" });
  }
}
