// lib/api.ts

/**
 * 1. LA CORRECTION DÉFINITIVE : 
 * On bloque toutes les requêtes fantômes vers transcode, freetv, etc.
 * La nouvelle architecture (/api/show et /api/vod) s'occupe de tout le routage en direct.
 */
export async function resolveSrc(type: string, id: string | number, defaultExt = "mp4") {
  return { 
    url: "", 
    ext: defaultExt 
  };
}

/**
 * 2. LES APPELS API XTREAM CLASSIQUES
 * (Utilisés par ton application pour récupérer les infos des films et séries)
 */
export const api = {
  vodInfo: async (id: string | number) => {
    const res = await fetch(`/api/xtream?action=get_vod_info&vod_id=${id}`);
    if (!res.ok) throw new Error("Erreur lors de la récupération des infos du film");
    return res.json();
  },
  
  seriesInfo: async (id: string | number) => {
    const res = await fetch(`/api/xtream?action=get_series_info&series_id=${id}`);
    if (!res.ok) throw new Error("Erreur lors de la récupération des infos de la série");
    return res.json();
  }

  // (Note : Si tu avais d'autres fonctions ici comme 'getLiveCategories' ou 'getVodStreams', 
  // tu peux les conserver en dessous, l'important était de corriger 'resolveSrc' plus haut !)
};
