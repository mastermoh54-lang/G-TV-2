"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, User, Lock, Play } from "lucide-react";
import { api } from "@/lib/api";
import { normalizeBaseUrl } from "@/lib/xtream/urls";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    
    try {
      // ✅ ON RESTAURE L'URL DU PROXY VERCEL ICI
      // Cela ne causera plus de CORS car l'appel réseau reste local grâce au fichier lib/api.ts
      // Cette URL sert juste à dire au backend interne : "Vérifie ces identifiants sur cette adresse"
      const apiUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
      
      if (!apiUrl) {
        throw new Error("Erreur de configuration : L'URL de l'API est manquante.");
      }
      
      const url = normalizeBaseUrl(apiUrl);
      const response = await api.login(url, username, password);
      
      console.log("Connexion réussie :", response);

      // Redirection après succès
      router.replace("/"); 
      router.refresh();
      
    } catch (e) {
      console.error("Erreur de connexion :", e);
      setError(e instanceof Error ? e.message : "Identifiants incorrects ou serveur injoignable");
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0b0c10] px-5 py-12">
      {/* BACKGROUND CINÉMATIQUE IMMERSIF */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://image.tmdb.org/t/p/original/rMZ7qOkP4CjH8LkoUDRX91Q9zVq.jpg')] bg-cover bg-center bg-no-repeat opacity-20 blur-sm mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-transparent to-[#0b0c10]/50" />
        
        {/* Glow Effects */}
        <div className="absolute -left-[20%] top-1/4 h-[50vh] w-[50vh] rounded-full bg-indigo-600/20 blur-[150px]" />
        <div className="absolute -right-[20%] bottom-1/4 h-[40vh] w-[40vh] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/30">
            <Play className="h-10 w-10 translate-x-0.5 fill-white text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">G-Player</h1>
          <p className="mt-2 text-sm font-medium text-zinc-400">
            Votre portail de streaming premium
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <div className="relative space-y-5">
            <Field 
              label="Identifiant" 
              icon={<User className="h-4 w-4" />}
              placeholder="Entrez votre nom d'utilisateur" 
              value={username} 
              onChange={setUsername} 
              autoFocus 
            />
            <Field 
              label="Mot de passe" 
              icon={<Lock className="h-4 w-4" />}
              placeholder="••••••••" 
              type="password" 
              value={password} 
              onChange={setPassword} 
            />

            {error && (
              <div className="animate-in fade-in slide-in-from-top-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-center text-sm font-medium text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !username || !password}
              className={cn(
                "group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-4 py-3.5 font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Se connecter 
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-xs font-medium text-zinc-500">
          Connexion chiffrée &bull; Identifiants stockés localement
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors peer-focus:text-indigo-400">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="peer w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 transition-all focus:border-indigo-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>
    </label>
  );
}
