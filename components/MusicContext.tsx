'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface MusicContextType {
  isPlaying: boolean;
  toggleMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // African-style rhythmic track (Royalty Free)
    const musicUrl = process.env.NEXT_PUBLIC_MUSIC_URL || 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3';
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audioRef.current = audio;

    // Log for debugging
    audio.addEventListener('error', (e) => {
      console.error("Audio failed to load:", e);
    });

    // Check local storage for preference
    const savedPreference = localStorage.getItem('whot_music_enabled');
    if (savedPreference === 'true') {
      // Browsers block autoplay, so we can only play after user interaction
      // We'll handle this in the toggle or first click
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('whot_music_enabled', 'false');
    } else {
      audioRef.current.play().catch(err => console.log("Autoplay blocked:", err));
      setIsPlaying(true);
      localStorage.setItem('whot_music_enabled', 'true');
    }
  };

  // Try to resume if it was playing before
  useEffect(() => {
    const handleFirstInteraction = () => {
      const savedPreference = localStorage.getItem('whot_music_enabled');
      if (savedPreference === 'true' && !isPlaying && audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      window.removeEventListener('click', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, [isPlaying]);

  return (
    <MusicContext.Provider value={{ isPlaying, toggleMusic }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
