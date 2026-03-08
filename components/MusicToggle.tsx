"use client";

import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useMusic } from "./MusicContext";
import { motion } from "motion/react";

export function MusicToggle() {
  const { isPlaying, toggleMusic } = useMusic();

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleMusic}
      className="fixed bottom-6 right-6 z-[100] w-12 h-12 bg-white border-4 border-amber-900/10 rounded-full shadow-2xl flex items-center justify-center text-amber-900 hover:text-emerald-600 transition-all group"
      title={isPlaying ? "Mute Music" : "Play Music"}
    >
      {isPlaying ? (
        <Volume2 className="w-6 h-6 animate-pulse" />
      ) : (
        <VolumeX className="w-6 h-6 opacity-50" />
      )}

      {/* Tooltip */}
      <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-amber-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {isPlaying ? "Music On" : "Music Off"}
      </span>
    </motion.button>
  );
}
