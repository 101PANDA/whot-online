'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Loader2, ArrowLeft, Shield, Gamepad2, Plus } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  isReady: boolean;
  isBot?: boolean;
}

interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  status: 'waiting' | 'selecting_mode' | 'playing' | 'finished';
}

export default function WaitingRoomPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const socket = useSocket();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const isHost = React.useMemo(() => {
    if (!room || !socket) return false;
    return room.players[0].id === socket.id;
  }, [room, socket]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const username = localStorage.getItem('whot_username');
    if (!username) {
      router.push('/');
      return;
    }

    if (socket) {
      socket.emit('get_room_details', roomId, (roomData: Room) => {
        if (roomData) {
          if (roomData.status === 'selecting_mode' || roomData.status === 'playing') {
            router.push(`/game/${roomId}`);
            return;
          }
          setRoom(roomData);
        } else {
          // If room not found, we might need to fetch it differently or it might be a new room
          // For now, we'll wait for player_joined event which also sends room data
        }
      });

      socket.on('player_joined', (updatedRoom: Room) => {
        if (updatedRoom.id === roomId) {
          if (updatedRoom.status === 'selecting_mode' || updatedRoom.status === 'playing') {
            router.push(`/game/${roomId}`);
            return;
          }
          setRoom(updatedRoom);
        }
      });

      socket.on('player_left', (data: { username: string; room: Room }) => {
        if (data.room.id === roomId) {
          setRoom(data.room);
        }
      });

      socket.on('game_started', (startedRoom: Room) => {
        if (startedRoom.id === roomId) {
          router.push(`/game/${roomId}`);
        }
      });

      socket.on('selecting_mode', (updatedRoom: Room) => {
        if (updatedRoom.id === roomId) {
          router.push(`/game/${roomId}`);
        }
      });

      return () => {
        socket.off('player_joined');
        socket.off('player_left');
        socket.off('game_started');
        socket.off('selecting_mode');
      };
    }
  }, [socket, roomId, router]);

  const handleLeave = () => {
    if (socket) {
      socket.emit('leave_room', roomId);
    }
    router.push('/lobby');
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const playersNeeded = room.maxPlayers - room.players.length;

  return (
    <main className="min-h-screen bg-stone-950 text-white p-4 sm:p-8 flex items-center justify-center">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">{room.name}</h1>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Waiting Room</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-mono font-bold text-gray-300">
                {room.players.length}/{room.maxPlayers}
              </span>
            </div>
          </div>

          {/* Player List */}
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {room.players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/10 transition-all"
                  >
                    <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-lg font-bold text-emerald-500 border border-white/10">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="block text-white font-bold">{player.username}</span>
                        {player.isBot && (
                          <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded uppercase tracking-tighter">Bot</span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Player {index + 1}</span>
                    </div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </motion.div>
                ))}
                {Array.from({ length: playersNeeded }).map((_, i) => (
                  <motion.div
                    key={`empty-${i}`}
                    className="flex items-center gap-4 p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl opacity-50"
                  >
                    <div className="w-10 h-10 bg-transparent border border-dashed border-white/20 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-gray-600 font-bold italic">Waiting for player...</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Status Message */}
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <Gamepad2 className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-1">
                  {playersNeeded === 0 ? 'Starting Game...' : `Waiting for ${playersNeeded} more player${playersNeeded > 1 ? 's' : ''}...`}
                </h3>
                <p className="text-gray-500 text-sm font-medium">
                  The game will start automatically once the room is full.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isHost && room.players.length < room.maxPlayers && (
                <button
                  onClick={() => {
                    if (socket) {
                      socket.emit('add_bot', roomId, (res: any) => {
                        if (!res.success) alert(res.message);
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Bot
                </button>
              )}
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 rounded-xl text-gray-400 hover:text-red-400 font-bold transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Leave Room
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
