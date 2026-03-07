'use client';

import React, { useState } from 'react';
import { X, Plus, Shield, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; maxPlayers: number; password?: string }) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, maxPlayers, password: password || undefined });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#E6D5B8] border-4 border-amber-900/20 rounded-[2.5rem] shadow-2xl overflow-hidden p-1"
          >
            <div className="bg-white rounded-[2.2rem] border-2 border-amber-900/10 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50">
                <h2 className="text-xl font-black text-amber-900 flex items-center gap-2 uppercase tracking-tight">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Create New Room
                </h2>
                <button onClick={onClose} className="text-stone-400 hover:text-amber-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-amber-900/40 uppercase tracking-[0.3em] flex items-center gap-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter room name..."
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-4 text-amber-900 placeholder:text-stone-300 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-amber-900/40 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Max Participants
                  </label>
                  <div className="flex gap-3">
                    {[2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMaxPlayers(num)}
                        className={`
                          flex-1 py-4 rounded-2xl font-black transition-all
                          ${maxPlayers === num 
                            ? 'bg-emerald-500 text-white shadow-[0_4px_0_rgb(5,150,105)]' 
                            : 'bg-stone-50 text-stone-400 border-2 border-stone-200 hover:border-emerald-500'
                          }
                        `}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-amber-900/40 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Room Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank for no password"
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-4 text-amber-900 placeholder:text-stone-300 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-5 rounded-2xl shadow-[0_8px_0_rgb(5,150,105)] active:shadow-none active:translate-y-2 transition-all uppercase tracking-widest text-sm"
                >
                  Create & Join Room
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateRoomModal;
