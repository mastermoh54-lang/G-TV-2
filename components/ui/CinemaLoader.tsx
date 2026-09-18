"use client";

import React from "react";

export function CinemaLoader() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
      <video
        src="/attente.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover opacity-90"
      />
      {/* Ombre par-dessus pour l'immersion */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-transparent to-black/30" />
      
      {/* Texte clignotant élégant */}
      <div className="absolute bottom-4 left-0 right-0 animate-pulse text-center sm:bottom-8">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 sm:text-sm">
          Préparation de la séance...
        </span>
      </div>
    </div>
  );
}
