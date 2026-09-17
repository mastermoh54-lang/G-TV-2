// app/api/live/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing live stream ID", { status: 400 });
  }

  // Redirection autonome vers le proxy HLS parfait
  return NextResponse.redirect(`${origin}/api/hls?id=${id}`);
}
