import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const media = searchParams.get("media") || "movie";
  const slot = searchParams.get("slot");

  let phpApiUrl = `https://gmz.page.gd/api.php?media=${media}`;
  if (slot) {
    phpApiUrl += `&slot=${slot}`;
  }

  try {
    const res = await fetch(phpApiUrl, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ status: "error", message: "Impossible de joindre l'AdServer PHP" }, { status: 500 });
  }
}
