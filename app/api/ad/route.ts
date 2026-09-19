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

    const rawText = await res.text();

    // Extraction du contenu JSON situé entre la première accolade { et la dernière }
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return NextResponse.json({ status: "empty", message: "Aucun JSON trouvé dans la réponse" });
    }

    const jsonString = rawText.substring(firstBrace, lastBrace + 1);
    const data = JSON.parse(jsonString);

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
  } catch (error: any) {
    return NextResponse.json({
      status: "empty",
      message: "Erreur lors du traitement de l'AdServer",
      error: error?.message,
    });
  }
}
