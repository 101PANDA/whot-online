'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, RefreshCw, Trophy, ArrowLeft, Users, Info, HelpCircle } from 'lucide-react';
import Card from '@/components/Card';

type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

interface CardData {
  id: string;
  shape: Shape;
  number: number;
}

interface Player {
  id: string;
  username: string;
  cards: CardData[];
  isReady: boolean;
  isBot?: boolean;
}

interface RoundResult {
  winner: string;
  eliminated?: { username: string, score: number };
  scores: { username: string, score: number }[];
}

interface GameState {
  deck: CardData[];
  discardPile: CardData[];
  currentPlayerIndex: number;
  turnDirection: 1 | -1;
  pendingDrawCount: number;
  generalMarketTurns?: number;
  lastPlayedCard?: CardData;
  requestedShape?: Shape;
  winner?: string;
  roundResult?: RoundResult;
}

interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  status: 'waiting' | 'selecting_mode' | 'playing' | 'finished';
  gameMode?: 'challenge' | 'championship';
  currentRound: number;
  eliminatedPlayerIds: string[];
  playerRanking: { username: string, rank: number, score?: number }[];
  gameState?: GameState;
}

export default function GamePage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [showShapeSelector, setShowShapeSelector] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{ winner: string; message?: string } | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [championshipOver, setChampionshipOver] = useState<{ champion: string } | null>(null);
  const [playerLeftMsg, setPlayerLeftMsg] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ 
    type: 'play' | 'draw', 
    playerId: string, 
    card?: CardData, 
    count?: number,
    id: string,
    rotation: number
  } | null>(null);
  const socket = useSocket();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const isHost = useMemo(() => {
    if (!room || !socket) return false;
    return room.players[0].id === socket.id;
  }, [room, socket]);

  const isEliminated = useMemo(() => {
    if (!room || !socket) return false;
    return room.eliminatedPlayerIds.includes(socket.id || '');
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
        if (roomData) setRoom(roomData);
      });

      socket.on('game_state_updated', (updatedRoom: Room) => {
        if (updatedRoom.id === roomId) {
          setRoom(updatedRoom);
          // If it's not our turn anymore, close shape selector
          const myIndex = updatedRoom.players.findIndex(p => p.id === socket.id);
          if (updatedRoom.gameState?.currentPlayerIndex !== myIndex) {
            setShowShapeSelector(false);
          }
        }
      });

      socket.on('card_played', ({ playerId, card }) => {
        setLastAction({ 
          type: 'play', 
          playerId, 
          card, 
          id: `${Date.now()}-${Math.random()}`,
          rotation: Math.random() * 20 - 10
        });
        setTimeout(() => setLastAction(null), 1000);
      });

      socket.on('card_drawn', ({ playerId, count }) => {
        setLastAction({ 
          type: 'draw', 
          playerId, 
          count, 
          id: `${Date.now()}-${Math.random()}`,
          rotation: Math.random() * 20 - 10
        });
        setTimeout(() => setLastAction(null), 1000);
      });

      socket.on('game_over', (data: { winner: string; message?: string; room: Room }) => {
        if (data.room.id === roomId) {
          setGameOver({ winner: data.winner, message: data.message });
          setRoom(data.room);
        }
      });

      socket.on('selecting_mode', (updatedRoom: Room) => {
        if (updatedRoom.id === roomId) setRoom(updatedRoom);
      });

      socket.on('round_ended', (data: { roundResult: RoundResult, room: Room }) => {
        if (data.room.id === roomId) {
          setRoom(data.room);
          setRoundResult(data.roundResult);
        }
      });

      socket.on('championship_over', (data: { champion: string, room: Room }) => {
        if (data.room.id === roomId) {
          setRoom(data.room);
          setChampionshipOver({ champion: data.champion });
        }
      });

      socket.on('game_started', (updatedRoom: Room) => {
        if (updatedRoom.id === roomId) {
          setRoom(updatedRoom);
          setRoundResult(null);
        }
      });

      socket.on('player_left', (data: { username: string; room: Room }) => {
        if (data.room.id === roomId) {
          setRoom(data.room);
          if (data.room.status === 'playing') {
            setPlayerLeftMsg(`${data.username} has left the game.`);
            setTimeout(() => setPlayerLeftMsg(null), 5000);
          }
        }
      });

      return () => {
        socket.off('game_state_updated');
        socket.off('card_played');
        socket.off('card_drawn');
        socket.off('game_over');
        socket.off('player_left');
      };
    }
  }, [socket, roomId, router]);

  const myPlayer = useMemo(() => {
    if (!room || !socket) return null;
    return room.players.find(p => p.id === socket.id);
  }, [room, socket]);

  const myIndex = useMemo(() => {
    if (!room || !socket) return -1;
    return room.players.findIndex(p => p.id === socket.id);
  }, [room, socket]);

  const isMyTurn = useMemo(() => {
    if (!room || !room.gameState) return false;
    return room.gameState.currentPlayerIndex === myIndex;
  }, [room, myIndex]);

  const otherPlayers = useMemo(() => {
    if (!room || myIndex === -1) return [];
    const others = [];
    for (let i = 1; i < room.players.length; i++) {
      const idx = (myIndex + i) % room.players.length;
      others.push({ ...room.players[idx], position: i });
    }
    return others;
  }, [room, myIndex]);

  const handlePlayCard = (cardId: string) => {
    if (!isMyTurn || !room || !room.gameState) return;
    
    const card = myPlayer?.cards.find(c => c.id === cardId);
    if (!card) return;

    // Check if it's a Whot card
    if (card.number === 20) {
      setSelectedCardId(cardId);
      setShowShapeSelector(true);
      return;
    }

    socket?.emit('play_card', { roomId, cardId });
  };

  const handleSelectShape = (shape: Shape) => {
    if (selectedCardId && socket) {
      socket.emit('play_card', { roomId, cardId: selectedCardId, requestedShape: shape });
      setShowShapeSelector(false);
      setSelectedCardId(null);
    }
  };

  const handleDrawCard = () => {
    if (!isMyTurn || !socket || isEliminated) return;
    socket.emit('draw_card', { roomId });
  };

  const handleSelectMode = (mode: 'challenge' | 'championship') => {
    if (socket) {
      socket.emit('select_mode', { roomId, mode });
    }
  };

  const handleContinueRound = () => {
    if (socket) {
      socket.emit('continue_round', { roomId });
    }
  };

  const handleExitGame = () => {
    router.push('/');
  };

  const handleBackToLobby = () => {
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

  if (room.status === 'waiting') {
    return (
      <main className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-stone-900 border border-white/10 rounded-3xl p-12 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-24 h-24 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
            <Users className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Waiting Room</h2>
          <p className="text-emerald-500 font-bold mb-8 animate-pulse">
            {room.players.length} / {room.maxPlayers} Players Joined
          </p>
          
          <div className="space-y-3 mb-8">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-bold text-white">{p.username}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Ready</span>
              </div>
            ))}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
              <div key={i} className="flex items-center justify-center p-4 bg-black/20 rounded-2xl border border-dashed border-white/10">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Waiting for player...</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {isHost && room.players.length < room.maxPlayers && (
              <button
                onClick={() => socket?.emit('add_bot', roomId, () => {})}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
              >
                Add Bot
              </button>
            )}
            <button
              onClick={handleBackToLobby}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-500 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
            >
              Leave Room
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  if (room.status === 'selecting_mode') {
    return (
      <main className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
            <Users className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Select Game Mode</h2>
          <p className="text-gray-400 mb-8">
            {isHost ? 'The room is full! Choose how you want to play.' : 'Waiting for host to select game mode...'}
          </p>

          {isHost ? (
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleSelectMode('challenge')}
                className="group relative bg-white/5 hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 p-6 rounded-2xl transition-all text-left"
              >
                <span className="block text-xl font-black text-white group-hover:text-white mb-1">Challenge</span>
                <span className="block text-sm text-gray-400 group-hover:text-emerald-100">Classic Whot. First to finish wins.</span>
              </button>
              <button
                onClick={() => handleSelectMode('championship')}
                className="group relative bg-white/5 hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 p-6 rounded-2xl transition-all text-left"
              >
                <span className="block text-xl font-black text-white group-hover:text-white mb-1">Championship</span>
                <span className="block text-sm text-gray-400 group-hover:text-emerald-100">Elimination rounds until one champion remains.</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <span className="text-emerald-500 font-bold animate-pulse">Host is deciding...</span>
            </div>
          )}
        </motion.div>
      </main>
    );
  }

  if (!room.gameState) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const topCard = room.gameState.discardPile[room.gameState.discardPile.length - 1];

  return (
    <main className="min-h-screen bg-emerald-900 overflow-hidden relative font-sans">
      {/* Animations Layer */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            key={lastAction.id}
            initial={lastAction.type === 'play' ? { 
              x: lastAction.playerId === socket?.id ? 0 : (lastAction.playerId === room?.players[0]?.id ? -300 : 300), 
              y: lastAction.playerId === socket?.id ? 300 : -300,
              scale: 0.5,
              opacity: 0,
              rotate: 0
            } : {
              x: 0,
              y: 0,
              scale: 0.8,
              opacity: 0,
              rotate: 0
            }}
            animate={lastAction.type === 'play' ? {
              x: 0,
              y: 0,
              scale: 1,
              opacity: 1,
              rotate: lastAction.rotation
            } : {
              x: lastAction.playerId === socket?.id ? 0 : (lastAction.playerId === room?.players[0]?.id ? -300 : 300),
              y: lastAction.playerId === socket?.id ? 300 : -300,
              scale: 0.5,
              opacity: 1,
              rotate: 360
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"
          >
            <div className="w-24 h-36 bg-white border-2 border-amber-900/20 rounded-xl shadow-2xl flex items-center justify-center overflow-hidden">
              {lastAction.type === 'play' && lastAction.card ? (
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-amber-900">{lastAction.card.number}</span>
                  <ShapeIcon shape={lastAction.card.shape} className="w-8 h-8 text-amber-900" />
                </div>
              ) : (
                <div className="w-full h-full bg-emerald-600 flex items-center justify-center">
                  <div className="w-16 h-24 border-4 border-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white font-black text-2xl">?</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Table Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-emerald-800/50 pointer-events-none" />
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header Info */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-4">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-400 leading-none mb-1">Room</span>
            <span className="text-sm font-bold text-white">{room.name}</span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-20 z-20">
        <button 
          onClick={handleBackToLobby}
          className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-white font-bold text-sm flex items-center gap-2 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Lobby
        </button>
      </div>

      {/* Game Layout */}
      <div className="relative w-full h-screen flex flex-col items-center justify-between p-4 sm:p-8">
        
        {/* Spectator Message */}
        {isEliminated && room.status === 'playing' && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-amber-600/90 backdrop-blur-md text-white px-6 py-2 rounded-full shadow-xl border border-white/20 flex items-center gap-3">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-black uppercase tracking-widest">You are spectating</span>
          </div>
        )}

        {/* Top Player (Player 2 or 3) */}
        <div className="flex flex-col items-center gap-2">
          {otherPlayers.find(p => p.position === (room.players.length === 2 ? 1 : 2)) && (
            <PlayerSeat 
              player={otherPlayers.find(p => p.position === (room.players.length === 2 ? 1 : 2))!} 
              isTurn={room.gameState.currentPlayerIndex === room.players.findIndex(p => p.id === otherPlayers.find(p => p.position === (room.players.length === 2 ? 1 : 2))?.id)}
              isEliminated={room.eliminatedPlayerIds.includes(otherPlayers.find(p => p.position === (room.players.length === 2 ? 1 : 2))?.id || '')}
            />
          )}
        </div>

        {/* Middle Section: Left, Center, Right */}
        <div className="flex-1 w-full flex items-center justify-between max-w-6xl">
          {/* Left Player */}
          <div className="w-32 h-64 flex items-center justify-center">
            {otherPlayers.find(p => p.position === 1) && room.players.length > 2 && (
              <PlayerSeat 
                player={otherPlayers.find(p => p.position === 1)!} 
                isTurn={room.gameState.currentPlayerIndex === room.players.findIndex(p => p.id === otherPlayers.find(p => p.position === 1)?.id)}
                isEliminated={room.eliminatedPlayerIds.includes(otherPlayers.find(p => p.position === 1)?.id || '')}
                vertical
              />
            )}
          </div>

          {/* Center Area: Deck & Discard Pile */}
          <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-16">
            {/* Market Pile (Deck) */}
            <div className="relative group cursor-pointer" onClick={handleDrawCard}>
              <div className="absolute -inset-2 bg-emerald-400/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Card faceDown className="shadow-2xl transform -rotate-3 translate-x-1" />
              <Card faceDown className="absolute top-0 left-0 shadow-2xl transform rotate-2 -translate-x-1" />
              <Card faceDown className="absolute top-0 left-0 shadow-2xl" />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                Market ({room.gameState.deck.length})
              </div>
              {isMyTurn && room.gameState.pendingDrawCount > 0 && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-xs font-black animate-bounce shadow-lg">
                  PICK {room.gameState.pendingDrawCount}!
                </div>
              )}
              {isMyTurn && room.gameState.generalMarketTurns && room.gameState.generalMarketTurns > 0 && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-xs font-black animate-bounce shadow-lg whitespace-nowrap">
                  GENERAL MARKET!
                </div>
              )}
            </div>

            {/* Discard Pile */}
            <div className="relative">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={topCard.id}
                  initial={{ scale: 1.5, opacity: 0, y: -50, rotate: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                  className="relative z-10"
                >
                  <Card shape={topCard.shape} number={topCard.number} disabled className="shadow-2xl" />
                </motion.div>
              </AnimatePresence>
              
              {/* Requested Shape Indicator */}
              {room.gameState.requestedShape && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-emerald-500 z-20 text-emerald-600"
                >
                  <ShapeIcon shape={room.gameState.requestedShape} className="w-6 h-6" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Player */}
          <div className="w-32 h-64 flex items-center justify-center">
            {otherPlayers.find(p => p.position === 3) && room.players.length === 4 && (
              <PlayerSeat 
                player={otherPlayers.find(p => p.position === 3)!} 
                isTurn={room.gameState.currentPlayerIndex === room.players.findIndex(p => p.id === otherPlayers.find(p => p.position === 3)?.id)}
                isEliminated={room.eliminatedPlayerIds.includes(otherPlayers.find(p => p.position === 3)?.id || '')}
                vertical
              />
            )}
          </div>
        </div>

        {/* Bottom Player (Me) */}
        <div className="w-full max-w-4xl flex flex-col items-center gap-6 pb-4">
          <div className="flex items-center gap-4">
            <div className={`
              px-6 py-2 rounded-full border-2 transition-all flex items-center gap-3
              ${isMyTurn 
                ? 'bg-emerald-500 border-white text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                : 'bg-black/40 border-white/10 text-gray-400'
              }
            `}>
              <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-white animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-sm font-black uppercase tracking-widest">
                {room.gameState.generalMarketTurns && room.gameState.generalMarketTurns > 0 
                  ? 'General Market! (Must Draw)' 
                  : (isMyTurn ? 'Your Turn' : `${room.players[room.gameState.currentPlayerIndex]?.username || 'Someone'}'s Turn`)
                }
              </span>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto pt-8 pb-4 scrollbar-hide">
            <div className="flex justify-center gap-2 sm:gap-4 px-4 min-w-max mx-auto">
              <AnimatePresence>
                {myPlayer?.cards.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100, scale: 0.5 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card 
                      shape={card.shape} 
                      number={card.number} 
                      onClick={() => handlePlayCard(card.id)}
                      disabled={!isMyTurn}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Shape Selector Modal */}
      <AnimatePresence>
        {showShapeSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border-4 border-emerald-600 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center"
            >
              <h2 className="text-2xl font-black text-amber-900 mb-2 tracking-tighter uppercase">Pick a Shape</h2>
              <p className="text-amber-800/60 text-sm font-medium mb-8">You played a WHOT card! Choose the next shape to continue.</p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { shape: 'circle' },
                  { shape: 'triangle' },
                  { shape: 'square' },
                  { shape: 'star' },
                  { shape: 'cross' },
                ].map(({ shape }) => (
                  <button
                    key={shape}
                    onClick={() => handleSelectShape(shape as Shape)}
                    className="flex flex-col items-center gap-3 p-6 bg-stone-50 border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 text-amber-900 rounded-2xl transition-all active:scale-95 group shadow-md"
                  >
                    <ShapeIcon shape={shape as Shape} className="w-10 h-10 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{shape}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Player Left Notification */}
      <AnimatePresence>
        {playerLeftMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20"
          >
            <Info className="w-5 h-5" />
            <span className="font-bold">{playerLeftMsg}</span>
            <button 
              onClick={handleBackToLobby}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
            >
              Exit
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              className="bg-stone-900 border border-white/10 rounded-3xl p-12 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
              <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-emerald-600/20 rounded-full border-2 border-emerald-500/50">
                <Trophy className="w-12 h-12 text-emerald-500" />
              </div>
              
              <h2 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Game Over!</h2>
              <p className="text-emerald-400 text-xl font-bold mb-8">
                {gameOver.winner ? (
                  gameOver.winner === myPlayer?.username ? 'YOU WON!' : `${gameOver.winner} Won!`
                ) : (
                  'Game Ended'
                )}
              </p>
              
              {gameOver.message && (
                <p className="text-gray-500 text-sm mb-8 bg-white/5 p-4 rounded-xl italic">
                  &quot;{gameOver.message}&quot;
                </p>
              )}

              <button
                onClick={handleBackToLobby}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/20 transition-all active:scale-95 text-lg uppercase tracking-widest"
              >
                Back to Lobby
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Round Result Modal */}
      <AnimatePresence>
        {roundResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-stone-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white mb-1 tracking-tighter uppercase">Round {room.currentRound} Ended</h2>
                <p className="text-emerald-500 font-bold uppercase tracking-widest text-xs">{roundResult.winner} Won the round!</p>
              </div>

              <div className="space-y-3 mb-8">
                {roundResult.scores.map((s) => (
                  <div key={s.username} className={`flex items-center justify-between p-4 rounded-2xl border ${s.username === roundResult.eliminated?.username ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center font-bold text-white text-xs">
                        {s.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-white">{s.username}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm font-mono">Score: {s.score}</span>
                      {s.username === roundResult.eliminated?.username && (
                        <span className="bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest">Eliminated</span>
                      )}
                      {s.username === roundResult.winner && (
                        <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest">Qualified</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {roundResult.eliminated?.username === myPlayer?.username ? (
                <div className="text-center">
                  <p className="text-red-400 font-bold mb-6">You have been eliminated!</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setRoundResult(null)}
                      className="bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                    >
                      Spectate
                    </button>
                    <button
                      onClick={handleExitGame}
                      className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                    >
                      Exit Game
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleContinueRound}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                  >
                    Continue
                  </button>
                  <button
                    onClick={handleExitGame}
                    className="bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                  >
                    Exit
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Championship Over Modal */}
      <AnimatePresence>
        {championshipOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-stone-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="mb-4 inline-flex items-center justify-center w-20 h-20 bg-amber-500/20 rounded-full border-2 border-amber-500/50 relative">
                <Trophy className="w-10 h-10 text-amber-500" />
                <div className="absolute -top-1 -right-1 text-2xl">👑</div>
              </div>

              <h2 className="text-3xl font-black text-white mb-1 tracking-tighter uppercase">Championship Over</h2>
              <p className="text-amber-500 text-lg font-black mb-6 uppercase tracking-widest">
                {championshipOver.champion === myPlayer?.username ? 'YOU ARE THE CHAMPION!' : `${championshipOver.champion} is the Champion!`}
              </p>

              <div className="space-y-2 mb-8 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {room.playerRanking.map((r, idx) => (
                  <div key={r.username} className={`flex items-center justify-between p-3 rounded-xl border ${idx === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-black ${idx === 0 ? 'text-amber-500' : 'text-gray-500'}`}>#{r.rank}</span>
                      <span className="text-base font-bold text-white">{r.username}</span>
                    </div>
                    {idx === 0 && <span className="text-xl">🏆</span>}
                  </div>
                ))}
              </div>

              <button
                onClick={handleBackToLobby}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-95 text-base uppercase tracking-widest"
              >
                Return to Lobby
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function PlayerSeat({ player, isTurn, isEliminated, vertical = false }: { player: Player; isTurn: boolean; isEliminated: boolean; vertical?: boolean }) {
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center gap-4 ${isEliminated ? 'opacity-40 grayscale' : ''}`}>
      <div className={`
        relative p-1 rounded-full border-2 transition-all
        ${isTurn ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-white/10'}
      `}>
        <div className="w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center text-lg font-bold text-white border border-white/10">
          {player.username.charAt(0).toUpperCase()}
        </div>
        {isTurn && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-stone-900 animate-pulse" />
        )}
      </div>
      
      <div className={`flex flex-col ${vertical ? 'items-center text-center' : 'items-start text-left'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-white leading-none">{player.username}</span>
          {isEliminated && (
            <span className="text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded uppercase tracking-tighter">Eliminated</span>
          )}
          {player.isBot && !isEliminated && (
            <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded uppercase tracking-tighter">Bot</span>
          )}
        </div>
        {!isEliminated && (
          <div className="flex gap-1">
            {Array.from({ length: player.cards.length }).map((_, i) => (
              <div key={i} className="w-3 h-4 bg-red-800 rounded-sm border border-white/20 shadow-sm" />
            ))}
            <span className="text-[10px] font-mono text-gray-400 ml-1">({player.cards.length})</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ShapeIcon({ shape, className }: { shape: Shape; className?: string }) {
  const { Circle, Triangle, Square, Star, Plus } = require('lucide-react');
  switch (shape) {
    case 'circle': return <Circle className={className} fill="currentColor" />;
    case 'triangle': return <Triangle className={className} fill="currentColor" />;
    case 'square': return <Square className={className} fill="currentColor" />;
    case 'star': return <Star className={className} fill="currentColor" />;
    case 'cross': return <Plus className={className} strokeWidth={4} fill="currentColor" />;
    case 'whot': return <div className={`font-black ${className}`}>W</div>;
    default: return null;
  }
}
