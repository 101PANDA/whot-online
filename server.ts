import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { v4 as uuidv4 } from 'uuid';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

// Game Types
type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';
interface Card {
  id: string;
  shape: Shape;
  number: number;
}

interface Player {
  id: string;
  username: string;
  cards: Card[];
  isReady: boolean;
  isBot?: boolean;
}

interface RoundResult {
  winner: string;
  eliminated?: { username: string, score: number };
  scores: { username: string, score: number }[];
}

interface Room {
  id: string;
  name: string;
  password?: string;
  maxPlayers: number;
  players: Player[];
  status: 'waiting' | 'selecting_mode' | 'playing' | 'finished';
  gameMode?: 'challenge' | 'championship';
  currentRound: number;
  eliminatedPlayerIds: string[];
  playerRanking: { username: string, rank: number, score?: number }[];
}

interface GameState {
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  turnDirection: 1 | -1;
  pendingDrawCount: number;
  activePenaltyCardNumber?: number;
  generalMarketTurns?: number;
  lastPlayedCard?: Card;
  requestedShape?: Shape;
  winner?: string;
  roundResult?: RoundResult;
}

// In-memory store
const rooms: Map<string, Room> = new Map();
const users: Map<string, string> = new Map(); // socketId -> username

// Whot Deck Generation
const createDeck = (): Card[] => {
  const deck: Card[] = [];
  const shapes: Shape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
  
  // Standard Whot deck distribution
  const distributions: Record<Shape, number[]> = {
    circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
    square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
    star: [1, 2, 3, 4, 5, 7, 8],
    whot: [20, 20, 20, 20, 20]
  };

  for (const shape of Object.keys(distributions) as Shape[]) {
    for (const num of distributions[shape]) {
      deck.push({ id: uuidv4(), shape, number: num });
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('login', (username: string, callback) => {
      if (Array.from(users.values()).includes(username)) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Username already taken' });
        return;
      }
      users.set(socket.id, username);
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('logout', () => {
      users.delete(socket.id);
      // Also leave any rooms
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit('player_left', room);
          }
          io.emit('rooms_updated');
        }
      });
    });

    socket.on('add_bot', (roomId, callback) => {
      const room = rooms.get(roomId);
      if (!room || room.players.length >= room.maxPlayers) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Room full or not found' });
        return;
      }

      const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
      const botUsername = `Bot_${Math.floor(Math.random() * 1000)}`;
      
      const newPlayer: Player = {
        id: botId,
        username: botUsername,
        cards: [],
        isReady: true,
        isBot: true
      };

      room.players.push(newPlayer);
      io.to(roomId).emit('player_joined', room);
      io.emit('rooms_updated');

      checkRoomFull(roomId);
      
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('get_rooms', (callback) => {
      const roomList = Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
        hasPassword: !!r.password,
        status: r.status
      }));
      if (typeof callback === 'function') callback(roomList);
    });

    socket.on('get_room_details', (roomId: string, callback) => {
      const room = rooms.get(roomId);
      if (typeof callback === 'function') callback(room || null);
    });

    socket.on('create_room', ({ name, maxPlayers, password }, callback) => {
      const username = users.get(socket.id);
      if (!username) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Not logged in' });
        return;
      }

      const roomId = uuidv4();
      const newRoom: Room = {
        id: roomId,
        name,
        password,
        maxPlayers,
        players: [{ id: socket.id, username, cards: [], isReady: false }],
        status: 'waiting',
        currentRound: 1,
        eliminatedPlayerIds: [],
        playerRanking: []
      };
      rooms.set(roomId, newRoom);
      socket.join(roomId);
      if (typeof callback === 'function') callback({ success: true, roomId });
      io.emit('rooms_updated');
    });

    socket.on('join_room', ({ roomId, password }, callback) => {
      const room = rooms.get(roomId);
      const username = users.get(socket.id);
      if (!room || !username) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Room or user not found' });
        return;
      }
      if (room.players.length >= room.maxPlayers) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Room is full' });
        return;
      }
      if (room.password && room.password !== password) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Incorrect password' });
        return;
      }

      room.players.push({ id: socket.id, username, cards: [], isReady: false });
      socket.join(roomId);
      if (typeof callback === 'function') callback({ success: true });
      io.to(roomId).emit('player_joined', room);
      io.emit('rooms_updated');

      checkRoomFull(roomId);
    });

    socket.on('quick_match', (callback) => {
      const username = users.get(socket.id);
      if (!username) return;

      // Find a room waiting for players with maxPlayers 2
      let room = Array.from(rooms.values()).find(r => r.status === 'waiting' && r.maxPlayers === 2 && r.players.length < 2 && !r.password);
      
      if (room) {
        room.players.push({ id: socket.id, username, cards: [], isReady: false });
        socket.join(room.id);
        if (typeof callback === 'function') callback({ success: true, roomId: room.id });
        io.to(room.id).emit('player_joined', room);
        checkRoomFull(room.id);
      } else {
        const roomId = uuidv4();
        const newRoom: Room = {
          id: roomId,
          name: `Quick Match ${roomId.slice(0,4)}`,
          maxPlayers: 2,
          players: [{ id: socket.id, username, cards: [], isReady: false }],
          status: 'waiting',
          currentRound: 1,
          eliminatedPlayerIds: [],
          playerRanking: []
        };
        rooms.set(roomId, newRoom);
        socket.join(roomId);
        if (typeof callback === 'function') callback({ success: true, roomId });
      }
      io.emit('rooms_updated');
    });

    socket.on('select_mode', ({ roomId, mode }, callback) => {
      const room = rooms.get(roomId);
      if (!room) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Room not found' });
        return;
      }
      
      // Only host can select mode (first player)
      if (room.players[0].id !== socket.id) {
        if (typeof callback === 'function') return callback({ success: false, message: 'Only host can select game mode' });
        return;
      }

      room.gameMode = mode;
      startGame(roomId);
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('continue_round', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      
      // Start next round
      room.currentRound++;
      startNextRound(roomId);
    });

    socket.on('leave_room', (roomId) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const leavingPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        socket.leave(roomId);

        const humanPlayers = room.players.filter(p => !p.isBot);

        if (humanPlayers.length === 0) {
          rooms.delete(roomId);
        } else {
          if (room.status === 'playing') {
            if (room.players.length < 2) {
              room.status = 'finished';
              io.to(roomId).emit('game_over', { 
                message: `${leavingPlayer.username} left the game.`, 
                room 
              });
              setTimeout(() => rooms.delete(roomId), 5000);
            } else {
              if (room.gameState && room.gameState.currentPlayerIndex >= room.players.length) {
                room.gameState.currentPlayerIndex = 0;
              }
              io.to(roomId).emit('player_left', { 
                username: leavingPlayer.username,
                room 
              });
            }
          } else {
            io.to(roomId).emit('player_left', { 
              username: leavingPlayer.username,
              room 
            });
          }
        }
        io.emit('rooms_updated');
      }
    });

    socket.on('play_card', ({ roomId, cardId, requestedShape }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== 'playing' || !room.gameState) return;

      const state = room.gameState;
      const currentPlayer = room.players[state.currentPlayerIndex];
      if (currentPlayer.id !== socket.id) return;

      const cardIndex = currentPlayer.cards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const card = currentPlayer.cards[cardIndex];
      const topCard = state.discardPile[state.discardPile.length - 1];

      // Validation
      let isValid = false;
      
      // If General Market is active, players cannot play cards, they must draw
      if (state.generalMarketTurns && state.generalMarketTurns > 0) {
        isValid = false;
      } else if (state.pendingDrawCount > 0 && state.activePenaltyCardNumber) {
        isValid = card.number === state.activePenaltyCardNumber;
      } else {
        if (card.shape === 'whot') {
          isValid = true;
        } else if (state.requestedShape) {
          isValid = card.shape === state.requestedShape;
        } else {
          isValid = card.shape === topCard.shape || card.number === topCard.number;
        }
      }

        if (isValid) {
          // Play card
          currentPlayer.cards.splice(cardIndex, 1);
          state.discardPile.push(card);
          state.lastPlayedCard = card;
          state.requestedShape = requestedShape || undefined;

          // Emit card played event for animation
          io.to(roomId).emit('card_played', { 
            playerId: socket.id, 
            card, 
            requestedShape: state.requestedShape 
          });

          // Check for win
          if (currentPlayer.cards.length === 0) {
          handleRoundEnd(roomId, currentPlayer.username);
          return;
        }

        // Handle Special Cards
        handleSpecialCard(roomId, card);
      }
    });

    socket.on('draw_card', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== 'playing' || !room.gameState) return;

      const state = room.gameState;
      const currentPlayer = room.players[state.currentPlayerIndex];
      if (currentPlayer.id !== socket.id) return;

      // Draw cards
      const drawnCards: Card[] = [];
      if (state.generalMarketTurns && state.generalMarketTurns > 0) {
        const card = drawFromDeck(state);
        if (card) {
          currentPlayer.cards.push(card);
          drawnCards.push(card);
        }
        state.generalMarketTurns--;
        
        io.to(roomId).emit('card_drawn', { 
          playerId: socket.id, 
          count: 1,
          cards: drawnCards 
        });

        nextTurn(roomId);
        return;
      }

      const count = state.pendingDrawCount > 0 ? state.pendingDrawCount : 1;
      for (let i = 0; i < count; i++) {
        const card = drawFromDeck(state);
        if (card) {
          currentPlayer.cards.push(card);
          drawnCards.push(card);
        }
      }

      io.to(roomId).emit('card_drawn', { 
        playerId: socket.id, 
        count,
        cards: drawnCards 
      });

      state.pendingDrawCount = 0;
      state.activePenaltyCardNumber = undefined;
      nextTurn(roomId);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const username = users.get(socket.id);
      users.delete(socket.id);

      // Remove player from rooms
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const leavingPlayer = room.players[playerIndex];
          room.players.splice(playerIndex, 1);
          
          const humanPlayers = room.players.filter(p => !p.isBot);
          
          if (humanPlayers.length === 0) {
            rooms.delete(roomId);
          } else {
            if (room.status === 'playing') {
              // End game if anyone leaves
              room.status = 'finished';
              io.to(roomId).emit('game_over', { 
                message: `${leavingPlayer.username} left the game.`, 
                room 
              });
              // Delete room after a short delay to allow players to see the result
              setTimeout(() => rooms.delete(roomId), 5000);
            } else {
              io.to(roomId).emit('player_left', { 
                username: leavingPlayer.username,
                room 
              });
            }
          }
          io.emit('rooms_updated');
        }
      });
    });
  });

  function checkRoomFull(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.players.length === room.maxPlayers) {
      if (room.maxPlayers === 2) {
        room.gameMode = 'challenge';
        startGame(roomId);
      } else {
        room.status = 'selecting_mode';
        io.to(roomId).emit('selecting_mode', room);
      }
    }
  }

  function nextTurn(roomId: string) {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) return;
    const state = room.gameState;
    
    let nextIndex = state.currentPlayerIndex;
    do {
      nextIndex = (nextIndex + state.turnDirection + room.players.length) % room.players.length;
    } while (room.eliminatedPlayerIds.includes(room.players[nextIndex].id));

    state.currentPlayerIndex = nextIndex;
    io.to(roomId).emit('game_state_updated', room);

    // Check if next player is a bot
    const nextPlayer = room.players[state.currentPlayerIndex];
    if (nextPlayer && nextPlayer.isBot && room.status === 'playing') {
      setTimeout(() => botTurn(roomId), 1500);
    }
  }

  function handleRoundEnd(roomId: string, winnerUsername: string) {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) return;
    const state = room.gameState;

    if (room.gameMode === 'challenge') {
      state.winner = winnerUsername;
      room.status = 'finished';
      io.to(roomId).emit('game_over', { winner: winnerUsername, room });
      setTimeout(() => rooms.delete(roomId), 10000);
      return;
    }

    // Championship Mode
    const scores = room.players.map(p => {
      const score = p.cards.reduce((sum, card) => sum + card.number, 0);
      return { username: p.username, score, id: p.id };
    });

    // Sort by score descending to find who to eliminate
    const activeScores = scores.filter(s => !room.eliminatedPlayerIds.includes(s.id));
    activeScores.sort((a, b) => b.score - a.score);

    const eliminated = activeScores[0];
    room.eliminatedPlayerIds.push(eliminated.id);
    
    // Add to ranking (reverse order of elimination)
    room.playerRanking.unshift({ 
      username: eliminated.username, 
      rank: activeScores.length, 
      score: eliminated.score 
    });

    const roundResult: RoundResult = {
      winner: winnerUsername,
      eliminated: { username: eliminated.username, score: eliminated.score },
      scores: activeScores.map(s => ({ username: s.username, score: s.score }))
    };

    state.roundResult = roundResult;
    
    // Check if only one player remains
    const remainingPlayers = room.players.filter(p => !room.eliminatedPlayerIds.includes(p.id));
    if (remainingPlayers.length === 1) {
      // Championship Finished
      const champion = remainingPlayers[0];
      room.playerRanking.unshift({ username: champion.username, rank: 1 });
      room.status = 'finished';
      io.to(roomId).emit('championship_over', { champion: champion.username, room });
      setTimeout(() => rooms.delete(roomId), 10000);
    } else {
      io.to(roomId).emit('round_ended', { roundResult, room });
    }
  }

  function startNextRound(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const deck = createDeck();
    const qualifiedPlayers = room.players.filter(p => !room.eliminatedPlayerIds.includes(p.id));

    // Deal 4 cards to each qualified player
    room.players.forEach(p => {
      if (!room.eliminatedPlayerIds.includes(p.id)) {
        p.cards = deck.splice(0, 4);
      } else {
        p.cards = [];
      }
    });

    // First card in discard pile
    let firstCardIndex = deck.findIndex(c => ![1, 2, 5, 8, 14, 20].includes(c.number));
    if (firstCardIndex === -1) firstCardIndex = 0;
    const firstCard = deck.splice(firstCardIndex, 1)[0];

    room.status = 'playing';
    room.gameState = {
      deck,
      discardPile: [firstCard],
      currentPlayerIndex: room.players.findIndex(p => p.id === qualifiedPlayers[0].id),
      turnDirection: 1,
      pendingDrawCount: 0
    };

    io.to(roomId).emit('game_started', room);
    
    // Bot turn if needed
    const currentPlayer = room.players[room.gameState.currentPlayerIndex];
    if (currentPlayer.isBot) {
      setTimeout(() => botTurn(roomId), 1500);
    }
  }

  function startGame(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const deck = createDeck();
    const players = room.players;

    // Deal 4 cards to each player
    players.forEach(p => {
      p.cards = deck.splice(0, 4);
    });

    // First card in discard pile (cannot be special card for simplicity)
    let firstCardIndex = deck.findIndex(c => ![1, 2, 5, 8, 14, 20].includes(c.number));
    if (firstCardIndex === -1) firstCardIndex = 0;
    const firstCard = deck.splice(firstCardIndex, 1)[0];

    room.status = 'playing';
    room.gameState = {
      deck,
      discardPile: [firstCard],
      currentPlayerIndex: 0,
      turnDirection: 1,
      pendingDrawCount: 0
    };

    io.to(roomId).emit('game_started', room);

    // Check if first player is a bot
    if (room.players[0].isBot) {
      setTimeout(() => botTurn(roomId), 1500);
    }
  }

  function drawFromDeck(state: GameState): Card | undefined {
    if (state.deck.length === 0) {
      const top = state.discardPile.pop()!;
      state.deck = state.discardPile;
      state.discardPile = [top];
      for (let k = state.deck.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [state.deck[k], state.deck[j]] = [state.deck[j], state.deck[k]];
      }
    }
    return state.deck.pop();
  }

  function handleSpecialCard(roomId: string, card: Card) {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) return;
    const state = room.gameState;

    switch (card.number) {
      case 1: // HOLD ON - Next player skips
        nextTurn(roomId);
        nextTurn(roomId);
        break;
      case 2: // PICK TWO
        state.pendingDrawCount += 2;
        state.activePenaltyCardNumber = 2;
        nextTurn(roomId);
        break;
      case 5: // PICK THREE
        state.pendingDrawCount += 3;
        state.activePenaltyCardNumber = 5;
        nextTurn(roomId);
        break;
      case 8: // SUSPENSION - Next player skips
        nextTurn(roomId);
        nextTurn(roomId);
        break;
      case 14: // GENERAL MARKET - Everyone else must draw 1, then back to player
        const activePlayers = room.players.filter(p => !room.eliminatedPlayerIds.includes(p.id));
        state.generalMarketTurns = activePlayers.length - 1;
        nextTurn(roomId);
        break;
      case 20: // WHOT - Shape is chosen, then next turn
        nextTurn(roomId);
        break;
      default:
        nextTurn(roomId);
    }
    
    io.to(roomId).emit('game_state_updated', room);
  }

  function botTurn(roomId: string) {
    const room = rooms.get(roomId);
    if (!room || !room.gameState || room.status !== 'playing') return;
    const state = room.gameState;
    const currentPlayer = room.players[state.currentPlayerIndex];
    if (!currentPlayer.isBot || room.eliminatedPlayerIds.includes(currentPlayer.id)) return;

    const topCard = state.discardPile[state.discardPile.length - 1];
    const requestedShape = state.requestedShape;

    // Find valid cards
    const validCards = currentPlayer.cards.filter(card => {
      if (state.pendingDrawCount > 0 && state.activePenaltyCardNumber) {
        return card.number === state.activePenaltyCardNumber;
      }
      
      if (card.number === 20) return true; // Whot is always valid
      if (requestedShape) return card.shape === requestedShape;
      return card.shape === topCard.shape || card.number === topCard.number;
    });

    if (validCards.length > 0 && (!state.generalMarketTurns || state.generalMarketTurns === 0)) {
      // Play a random valid card
      const card = validCards[Math.floor(Math.random() * validCards.length)];
      const cardIndex = currentPlayer.cards.findIndex(c => c.id === card.id);
      
      currentPlayer.cards.splice(cardIndex, 1);
      state.discardPile.push(card);
      state.lastPlayedCard = card;
      
      // If Whot, pick a random shape
      if (card.number === 20) {
        const shapes: Shape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
        state.requestedShape = shapes[Math.floor(Math.random() * shapes.length)];
      } else {
        state.requestedShape = undefined;
      }

      // Emit card played event for animation
      io.to(roomId).emit('card_played', { 
        playerId: currentPlayer.id, 
        card, 
        requestedShape: state.requestedShape 
      });

      // Check for win
      if (currentPlayer.cards.length === 0) {
        handleRoundEnd(roomId, currentPlayer.username);
        return;
      }

      handleSpecialCard(roomId, card);
    } else {
      // Draw cards
      const drawnCards: Card[] = [];
      if (state.generalMarketTurns && state.generalMarketTurns > 0) {
        const drawn = drawFromDeck(state);
        if (drawn) {
          currentPlayer.cards.push(drawn);
          drawnCards.push(drawn);
        }
        state.generalMarketTurns--;

        io.to(roomId).emit('card_drawn', { 
          playerId: currentPlayer.id, 
          count: 1,
          cards: drawnCards 
        });

        nextTurn(roomId);
        return;
      }

      const count = state.pendingDrawCount > 0 ? state.pendingDrawCount : 1;
      for (let i = 0; i < count; i++) {
        const drawn = drawFromDeck(state);
        if (drawn) {
          currentPlayer.cards.push(drawn);
          drawnCards.push(drawn);
        }
      }

      io.to(roomId).emit('card_drawn', { 
        playerId: currentPlayer.id, 
        count,
        cards: drawnCards 
      });
      
      state.pendingDrawCount = 0;
      state.activePenaltyCardNumber = undefined;
      nextTurn(roomId);
    }
  }

  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
