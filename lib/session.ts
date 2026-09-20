import { cookies } from "next/headers";
import type { XtreamCredentials } from "./xtream/types";

const COOKIE = "G-TV_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const HARDCODED_HOST = "https://gmztv.vercel.app";

/**
 * Garde-fou pour vérifier si Next.js est en train d'exécuter un build statique.
 */
function isBuilding(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build" || typeof window !== "undefined";
}

export async function setSessionCookie(creds: XtreamCredentials): Promise<void> {
  if (isBuilding()) return;
  try {
    const jar = await cookies();
    const value = Buffer.from(JSON.stringify(creds), "utf8").toString("base64");
    jar.set(COOKIE, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    });
  } catch {
    // Ignorer en mode export SPA client
  }
}

export async function clearSessionCookie(): Promise<void> {
  if (isBuilding()) return;
  try {
    const jar = await cookies();
    jar.delete(COOKIE);
  } catch {
    // Ignorer en mode export SPA client
  }
}

export async function getSession(): Promise<XtreamCredentials | null> {
  // Empêche Next.js d'exécuter cookies() pendant le pré-rendu statique
  if (isBuilding()) return null;

  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE)?.value;
    if (!raw) return null;
    
    const creds = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as XtreamCredentials;
    if (!creds.baseUrl) {
      creds.baseUrl = HARDCODED_HOST;
    }
    if (creds.baseUrl && creds.username && creds.password) return creds;
    return null;
  } catch {
    return null;
  }
}

/** Throws a tagged error when there is no session (used by API routes). */
export async function requireSession(): Promise<XtreamCredentials> {
  const creds = await getSession();
  if (!creds) {
    const err = new Error("Not authenticated");
    (err as Error & { code: string }).code = "NO_SESSION";
    throw err;
  }
  return creds;
}
