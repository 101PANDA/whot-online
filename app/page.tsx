'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { motion } from 'motion/react';
import { Gamepad2, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const socket = useSocket();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    if (!socket) return;

    setLoading(true);
    setError('');

    socket.emit('login', username, (response: { success: boolean; message?: string }) => {
      setLoading(false);
      if (response.success) {
        localStorage.setItem('whot_username', username);
        router.push('/lobby');
      } else {
        setError(response.message || 'Login failed');
      }
    });
  };

  return (
    <main className="min-h-screen bg-[#FDFCF0] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration - Nigerian Theme */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        {/* Leaf Accents */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-40 right-20 w-16 h-16 bg-emerald-400/20 rounded-full blur-lg" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-white border-4 border-emerald-600 rounded-[2rem] shadow-xl mb-6 relative"
          >
            <div className="absolute -top-2 -right-2 text-2xl">⭐</div>
            <Gamepad2 className="w-12 h-12 text-emerald-600" />
          </motion.div>
          <h1 className="text-7xl font-black text-amber-900 tracking-tighter mb-2 drop-shadow-sm">WHOT!</h1>
          <p className="text-emerald-700 font-black uppercase tracking-[0.2em] text-xs">The Ultimate Nigerian Card Game</p>
        </div>

        <div className="bg-[#E6D5B8] border-4 border-amber-900/20 p-1 rounded-[2.5rem] shadow-2xl">
          <div className="bg-white p-8 rounded-[2.2rem] border-2 border-amber-900/10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-amber-900/40 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                  <User className="w-3 h-3" />
                  Choose a Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-6 py-4 text-amber-900 placeholder:text-stone-300 focus:outline-none focus:border-emerald-500 transition-all text-lg font-bold text-center"
                  />
                </div>
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-red-500 text-xs font-black uppercase text-center bg-red-50 p-3 rounded-xl border border-red-100"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className={`
                  w-full py-5 rounded-2xl font-black text-xl transition-all shadow-[0_8px_0_rgb(5,150,105)] active:shadow-none active:translate-y-2
                  ${loading || !username.trim()
                    ? 'bg-stone-200 text-stone-400 shadow-[0_8px_0_rgb(214,211,209)] cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                  }
                `}
              >
                {loading ? 'JOINING...' : 'START PLAYING'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-stone-100 text-center">
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">
                No registration needed! Just pick a name and play.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
