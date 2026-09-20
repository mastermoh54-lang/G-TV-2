import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '*';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

  // -----------------------------------------------------------
  // 1. GESTION DE L'API (Utilisée par Cloudflare)
  // On laisse passer TOUTES les requêtes vers /api/ SANS Basic Auth
  // -----------------------------------------------------------
  if (isApiRoute) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    
    return response;
  }

  // -----------------------------------------------------------
  // 2. PROTECTION DU SITE VERCEL (Basic Auth)
  // Ne s'applique qu'aux pages normales (le frontend Vercel de secours)
  // -----------------------------------------------------------
  const password = process.env.SITE_PASSWORD;
  if (password) {
    const user = process.env.SITE_USER || "G-Player";
    const header = req.headers.get("authorization");
    
    if (header?.startsWith("Basic ")) {
      try {
        const [u, p] = atob(header.slice(6)).split(":");
        if (u === user && p === password) return NextResponse.next();
      } catch {
        // Échec de lecture, on passe au rejet
      }
    }
    
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="G-Player", charset="UTF-8"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|logo.svg|favicon.ico).*)"],
};
