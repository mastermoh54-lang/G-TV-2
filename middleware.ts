import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '*';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

  // 1. Gérer le preflight CORS (OPTIONS) en priorité absolue
  // On doit laisser passer cette vérification sans demander de mot de passe
  if (isApiRoute && req.method === 'OPTIONS') {
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

  // 2. Ta logique d'authentification Basic (inchangée)
  let response = NextResponse.next();
  const password = process.env.SITE_PASSWORD;

  if (password) {
    const user = process.env.SITE_USER || "G-Player";
    const header = req.headers.get("authorization");
    let isAuthenticated = false;

    if (header?.startsWith("Basic ")) {
      try {
        const [u, p] = atob(header.slice(6)).split(":");
        if (u === user && p === password) {
          isAuthenticated = true;
        }
      } catch {
        // fall through to challenge
      }
    }

    // Si pas authentifié, on bloque avec une 401
    if (!isAuthenticated) {
      response = new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="G-Player", charset="UTF-8"' },
      });
      
      // On ajoute quand même les en-têtes CORS en cas d'échec sur une API
      if (isApiRoute) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      return response;
    }
  }

  // 3. Ajouter les en-têtes CORS pour les vraies requêtes autorisées (POST, GET)
  if (isApiRoute) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  }

  return response;
}

export const config = {
  // On garde ton matcher qui protège tout ton site
  matcher: ["/((?!_next/static|_next/image|icon.svg|logo.svg|favicon.ico).*)"],
};
