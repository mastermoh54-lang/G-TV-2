import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const media = searchParams.get("media") || "movie";
  const slot = searchParams.get("slot");

  // Endpoint externe de l'AdServer PHP
  let phpApiUrl = `http://gmz.page.gd/api.php?media=${media}`;
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
    
    // Si la vidéo est renvoyée en chemin relatif, on reconstruit dynamiquement le lien HTTPS
    if (data?.ad?.video_url && !data.ad.video_url.startsWith("http")) {
      data.ad.video_url = `https://gmz.page.gd/${data.ad.video_url.replace(/^\//, "")}`;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur Proxy AdServer :", error);
    // Renvoie un statut 200 avec status: empty pour éviter de faire crasher le lecteur vidéo
    return NextResponse.json({ status: "empty", message: "Erreur de connexion AdServer" });
  }
}
