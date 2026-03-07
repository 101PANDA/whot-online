'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Zap, ArrowLeft, RefreshCw, Gamepad2, Users } from 'lucide-react';
import LobbyTable from '@/components/LobbyTable';
import CreateRoomModal from '@/components/CreateRoomModal';

interface Room {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: 'waiting' | 'playing' | 'finished';
}

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; roomId: string; password: string }>({
    isOpen: false,
    roomId: '',
    password: ''
  });
  const [loading, setLoading] = useState(true);
  const [quickMatchLoading, setQuickMatchLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whot_username');
    }
    return null;
  });
  const socket = useSocket();
  const router = useRouter();

  const fetchRooms = React.useCallback(() => {
    if (!socket) return;
    socket.emit('get_rooms', (roomList: Room[]) => {
      setRooms(roomList);
      setLoading(false);
    });
  }, [socket]);

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }

    if (socket) {
      fetchRooms();
      socket.on('rooms_updated', fetchRooms);
      socket.on('game_started', (room: any) => {
        router.push(`/game/${room.id}`);
      });
      return () => {
        socket.off('rooms_updated', fetchRooms);
        socket.off('game_started');
      };
    }
  }, [socket, router, fetchRooms, username]);

  const handleCreateRoom = (data: { name: string; maxPlayers: number; password?: string }) => {
    if (!socket) return;
    socket.emit('create_room', data, (response: { success: boolean; roomId?: string; message?: string }) => {
      if (response.success && response.roomId) {
        router.push(`/waiting-room/${response.roomId}`);
      } else {
        alert(response.message || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket) return;
    const room = rooms.find(r => r.id === roomId);
    
    if (room?.hasPassword) {
      setPasswordModal({ isOpen: true, roomId, password: '' });
      return;
    }

    socket.emit('join_room', { roomId, password: '' }, (response: { success: boolean; message?: string }) => {
      if (response.success) {
        router.push(`/waiting-room/${roomId}`);
      } else {
        alert(response.message || 'Failed to join room');
      }
    });
  };

  const submitPassword = () => {
    if (!socket || !passwordModal.roomId) return;
    
    socket.emit('join_room', { 
      roomId: passwordModal.roomId, 
      password: passwordModal.password 
    }, (response: { success: boolean; message?: string }) => {
      if (response.success) {
        router.push(`/waiting-room/${passwordModal.roomId}`);
      } else {
        alert(response.message || 'Incorrect password');
      }
      setPasswordModal({ isOpen: false, roomId: '', password: '' });
    });
  };

  const handleQuickMatch = () => {
    if (!socket) return;
    setQuickMatchLoading(true);
    socket.emit('quick_match', (response: { success: boolean; roomId?: string }) => {
      if (response.success && response.roomId) {
        router.push(`/waiting-room/${response.roomId}`);
      }
      setQuickMatchLoading(false);
    });
  };

  const handleBack = () => {
    if (socket) {
      socket.emit('logout');
    }
    localStorage.removeItem('whot_username');
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-[#FDFCF0] text-amber-900 p-4 sm:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b-4 border-amber-900/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white border-4 border-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Gamepad2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-amber-900">LOBBY</h1>
              <p className="text-emerald-700 text-[10px] font-black uppercase tracking-[0.3em]">Available Game Rooms</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRooms}
              className="p-4 rounded-2xl bg-white border-2 border-stone-200 hover:border-emerald-500 text-stone-400 hover:text-emerald-500 transition-all active:rotate-180 duration-500 shadow-sm"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
            <div className="px-6 py-3 bg-white border-2 border-stone-200 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-black text-amber-900">
                {username}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Room List */}
          <div className="lg:col-span-3">
            <div className="bg-[#E6D5B8] p-1 rounded-[2.5rem] shadow-xl">
              <div className="bg-white p-6 rounded-[2.2rem] border-2 border-amber-900/10 min-h-[400px]">
                {loading ? (
                  <div className="w-full h-64 flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                  </div>
                ) : (
                  <LobbyTable rooms={rooms} onJoin={handleJoinRoom} />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full group relative flex items-center justify-between p-8 bg-emerald-500 hover:bg-emerald-400 rounded-3xl shadow-[0_8px_0_rgb(5,150,105)] active:shadow-none active:translate-y-2 transition-all overflow-hidden"
            >
              <div className="z-10 text-left">
                <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-1">Host Game</span>
                <span className="text-2xl font-black text-white">Create Room</span>
              </div>
              <Plus className="w-10 h-10 text-white z-10" />
            </button>

            <button
              onClick={handleQuickMatch}
              disabled={quickMatchLoading}
              className="w-full group relative flex items-center justify-between p-8 bg-amber-400 hover:bg-amber-300 rounded-3xl shadow-[0_8px_0_rgb(180,130,0)] active:shadow-none active:translate-y-2 transition-all overflow-hidden disabled:opacity-50"
            >
              <div className="z-10 text-left">
                <span className="block text-[10px] font-black uppercase tracking-widest text-amber-800 mb-1">Instant Play</span>
                <span className="text-2xl font-black text-amber-900">
                  {quickMatchLoading ? 'Finding...' : 'Quick Match'}
                </span>
              </div>
              <Zap className="w-10 h-10 text-amber-900 z-10" />
            </button>

            <button
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-3 p-6 bg-stone-100 hover:bg-stone-200 border-2 border-stone-200 rounded-3xl text-stone-500 font-black uppercase tracking-widest transition-all text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </button>
          </div>
        </div>
      </div>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateRoom}
      />

      {/* Password Modal */}
      <AnimatePresence>
        {passwordModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#E6D5B8] border-4 border-amber-900/20 rounded-[2.5rem] p-1 max-w-sm w-full shadow-2xl"
            >
              <div className="bg-white rounded-[2.2rem] p-8 border-2 border-amber-900/10">
                <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-amber-900">Enter Password</h2>
                <input
                  type="password"
                  value={passwordModal.password}
                  onChange={(e) => setPasswordModal({ ...passwordModal, password: e.target.value })}
                  placeholder="Room Password"
                  className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-4 py-4 text-amber-900 placeholder:text-stone-300 focus:outline-none focus:border-emerald-500 transition-all mb-6 font-bold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setPasswordModal({ isOpen: false, roomId: '', password: '' })}
                    className="flex-1 px-6 py-4 bg-stone-100 hover:bg-stone-200 rounded-2xl font-black uppercase tracking-widest text-xs text-stone-500 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitPassword}
                    className="flex-1 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_4px_0_rgb(5,150,105)] active:shadow-none active:translate-y-1 transition-all"
                  >
                    Join
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
