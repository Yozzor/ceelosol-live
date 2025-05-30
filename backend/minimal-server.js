const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

console.log('🚀 Starting CeeloSol Backend Server with Socket.IO...');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://ceelosol-live.onrender.com",
      "https://ceelosol.com", 
      "https://www.ceelosol.com",
      "http://localhost:3000",
      "http://localhost:3002"
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  pingTimeout: 120000,
  pingInterval: 30000,
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

const PORT = process.env.PORT || 3001;

// DEDICATED HOUSE TREASURY WALLET (SEPARATE FROM ALL USER WALLETS)
const HOUSE_WALLET_ADDRESS = '8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS';

// Middleware
app.use(cors({
  origin: ['https://ceelosol-live.onrender.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'CeeloSol Backend'
  });
});

// House wallet endpoint
app.get('/api/house-wallet', (req, res) => {
  try {
    res.json({
      success: true,
      houseWallet: {
        publicKey: HOUSE_WALLET_ADDRESS,
        balance: 0,
        balanceInSOL: 0
      }
    });
  } catch (error) {
    console.error('Error fetching house wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch house wallet'
    });
  }
});

// Activity endpoints (simplified)
app.get('/api/activity/wins', (req, res) => {
  res.json({
    success: true,
    wins: []
  });
});

app.get('/api/activity/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalGames: 0,
      totalWinnings: 0,
      houseBalance: 0
    }
  });
});

// Basic Socket.IO lobby system
const lobbies = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('lobbies:request', () => {
    socket.emit('lobbies:list', Array.from(lobbies.values()));
  });

      socket.on('lobby:create', (data) => {
    const lobbyId = Date.now().toString();
    const lobby = {
      id: lobbyId,
      name: data.name || 'New Lobby',
      maxPlayers: data.maxPlayers || 4,
      betAmount: data.betAmount || 0.1,
      rounds: data.rounds || 3,
      players: [{
        id: data.walletAddress,
        walletAddress: data.walletAddress,
        socketId: socket.id,
        isReady: false,
        hasPaid: false,
        nickname: data.nickname || undefined
      }],
      status: 'waiting'
    };
    lobbies.set(lobbyId, lobby);
    socket.join(lobbyId);
    console.log(`🏠 Lobby created: ${lobbyId} by ${data.walletAddress}`);
    socket.emit('lobby:created', { lobbyId, lobby });
    io.emit('lobbies:list', Array.from(lobbies.values()));
  });
  socket.on('lobby:join', (data) => {
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit('error', { message: 'Lobby is full' });
      return;
    }

    // Check if player is already in lobby
    const existingPlayer = lobby.players.find(p => p.walletAddress === data.walletAddress);
    if (existingPlayer) {
      socket.emit('error', { message: 'Already in lobby' });
      return;
    }

    // Add player to lobby
    const newPlayer = {
      id: data.walletAddress,
      walletAddress: data.walletAddress,
      socketId: socket.id,
      isReady: false,
      hasPaid: false,
      nickname: data.nickname || undefined
    };

    lobby.players.push(newPlayer);
    socket.join(data.lobbyId);

    console.log(`👤 Player ${data.walletAddress} joined lobby ${data.lobbyId}`);

    // Check if lobby is now full and update status to payment
    if (lobby.players.length === lobby.maxPlayers) {
      lobby.status = 'payment';
      console.log(`💰 Lobby ${data.lobbyId} is now full! Status changed to payment`);
    }

    // Use setImmediate to ensure socket.join() completes before emitting
    setImmediate(() => {
      // Emit lobby:updated to match frontend expectations
      io.to(data.lobbyId).emit('lobby:updated', lobby);
      socket.emit('lobby:updated', lobby);

      // Additional emit to ensure frontend receives the update
      setTimeout(() => {
        socket.emit('lobby:updated', lobby);
      }, 10);

      // Broadcast updated lobby list
      io.emit('lobbies:list', Array.from(lobbies.values()));
    });
  });
  // Handle ready status
  socket.on('lobby:ready', (data) => {
    const { lobbyId, walletAddress, isReady } = data;
    console.log(`🎮 Ready status update: ${walletAddress} in lobby ${lobbyId} - ${isReady ? 'READY' : 'NOT READY'}`);

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      console.error(`❌ Lobby ${lobbyId} not found for ready status`);
      return;
    }

    // Find the player and update ready status
    const player = lobby.players.find(p => p.walletAddress === walletAddress);
    if (!player) {
      console.error(`❌ Player ${walletAddress} not found in lobby ${lobbyId}`);
      return;
    }

    // Update player ready status
    player.isReady = isReady;
    console.log(`✅ Player ${walletAddress} ready status updated to: ${isReady}`);

    // Check if all players are ready and have paid
    const allPlayersReady = lobby.players.every(p => p.isReady);
    const allPlayersPaid = lobby.players.every(p => p.hasPaid);
    const readyCount = lobby.players.filter(p => p.isReady).length;
    const paidCount = lobby.players.filter(p => p.hasPaid).length;

    console.log(`🎮 Ready status: ${readyCount}/${lobby.players.length} players ready`);
    console.log(`💰 Payment status: ${paidCount}/${lobby.players.length} players paid`);

    // Start game if all conditions are met
    if (allPlayersReady && allPlayersPaid && lobby.players.length === lobby.maxPlayers) {
      lobby.status = 'in-game';
      console.log(`🚀 Starting game in lobby ${lobbyId}!`);

      // Initialize game state
      lobby.gameState = {
        currentRound: 1,
        currentPlayerIndex: 0,
        roundResults: [],
        leaderboard: {},
        currentRoundRolls: {}
      };

      // Initialize leaderboard
      lobby.players.forEach(player => {
        lobby.gameState.leaderboard[player.walletAddress] = {
          wins: 0,
          totalWinnings: 0
        };
      });

      // Emit game start event with proper structure
      io.to(lobbyId).emit('game:started', {
        lobby: lobby,
        message: `Game starting! Round 1 of ${lobby.rounds}`
      });

      // Start first round
      setTimeout(() => {
        io.to(lobbyId).emit('round:started', {
          round: 1,
          totalRounds: lobby.rounds,
          currentPlayer: lobby.players[0].walletAddress,
          betAmount: lobby.difficulty === 'easy' ? 0.1 : 0.5
        });
      }, 1000);
    }

    // Broadcast updated lobby to all players in the lobby
    io.to(lobbyId).emit('lobby:updated', lobby);

    // Broadcast updated lobby list to all clients
    io.emit('lobbies:list', Array.from(lobbies.values()));
  });

  // Handle dice roll during game
  socket.on('game:roll', (data) => {
    const { lobbyId, walletAddress, dice } = data;
    console.log(`🎲 Player ${walletAddress} rolled: [${dice.join(', ')}] in lobby ${lobbyId}`);

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.status !== 'in-game' || !lobby.gameState) {
      console.error(`❌ Game not in progress for lobby ${lobbyId}`);
      return;
    }

    const gameState = lobby.gameState;
    const currentPlayer = lobby.players[gameState.currentPlayerIndex];

    // Verify it's the current player's turn
    if (currentPlayer.walletAddress !== walletAddress) {
      console.error(`❌ Not ${walletAddress}'s turn in lobby ${lobbyId}`);
      return;
    }

    // Validate dice roll
    if (!Array.isArray(dice) || dice.length !== 3 || dice.some(d => d < 1 || d > 6)) {
      console.error(`❌ Invalid dice roll from ${walletAddress}:`, dice);
      return;
    }

    // Simple ceelo resolution (basic version)
    const resolveCeelo = (dice) => {
      const sorted = [...dice].sort();

      // 4-5-6 = instant win
      if (sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6) {
        return { outcome: 'win', point: null };
      }

      // Triples = instant win
      if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) {
        return { outcome: 'win', point: null };
      }

      // 1-2-3 = instant loss
      if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
        return { outcome: 'lose', point: null };
      }

      // Pair + odd = point
      if (sorted[0] === sorted[1]) {
        return { outcome: 'point', point: sorted[2] };
      }
      if (sorted[1] === sorted[2]) {
        return { outcome: 'point', point: sorted[0] };
      }

      // Everything else = reroll/indeterminate
      return { outcome: 'reroll', point: null };
    };

    const rollResult = resolveCeelo(dice);

    // Store the roll
    gameState.currentRoundRolls[walletAddress] = {
      dice,
      outcome: rollResult.outcome,
      point: rollResult.point,
      timestamp: new Date()
    };

    // Broadcast the roll to all players in the lobby
    io.to(lobbyId).emit('player:rolled', {
      player: walletAddress,
      dice,
      outcome: rollResult.outcome,
      point: rollResult.point,
      round: gameState.currentRound
    });

    console.log(`🎯 Roll outcome: ${rollResult.outcome} for player ${walletAddress}`);

    // Handle the roll outcome
    if (rollResult.outcome === 'win' || rollResult.outcome === 'lose') {
      // Instant win/loss - round ends immediately
      console.log(`🏆 Instant ${rollResult.outcome}! Ending round immediately.`);

      // Update leaderboard
      if (rollResult.outcome === 'win') {
        gameState.leaderboard[walletAddress].wins += 1;
      }

      // End round
      io.to(lobbyId).emit('round:ended', {
        round: gameState.currentRound,
        winner: rollResult.outcome === 'win' ? walletAddress : null,
        winnings: 0,
        pointsEarned: rollResult.outcome === 'win' ? 1 : 0,
        isJackpot: false,
        leaderboard: gameState.leaderboard,
        roundResult: {
          round: gameState.currentRound,
          playerRolls: { [walletAddress]: dice },
          winner: rollResult.outcome === 'win' ? walletAddress : null,
          winnings: 0
        }
      });

      // Check if game is finished
      if (gameState.currentRound >= lobby.rounds) {
        // Game over
        lobby.status = 'finished';
        const winner = Object.entries(gameState.leaderboard)
          .sort(([,a], [,b]) => b.wins - a.wins)[0];

        io.to(lobbyId).emit('game:ended', {
          lobby,
          overallWinner: winner[0],
          finalLeaderboard: gameState.leaderboard,
          message: `Game completed! Winner: ${winner[0]}`
        });
      } else {
        // Start next round
        gameState.currentRound += 1;
        gameState.currentPlayerIndex = 0;
        gameState.currentRoundRolls = {};

        setTimeout(() => {
          io.to(lobbyId).emit('round:started', {
            round: gameState.currentRound,
            totalRounds: lobby.rounds,
            currentPlayer: lobby.players[0].walletAddress,
            betAmount: lobby.difficulty === 'easy' ? 0.1 : 0.5
          });
        }, 3000);
      }
    } else {
      // Point or reroll - move to next player
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % lobby.players.length;

      // Check if all players have rolled
      if (Object.keys(gameState.currentRoundRolls).length === lobby.players.length) {
        // All players have rolled, determine winner by comparing results
        console.log(`✅ All players have rolled! Determining round winner...`);

        let bestPlayer = null;
        let bestRoll = null;

        for (const [player, roll] of Object.entries(gameState.currentRoundRolls)) {
          if (roll.outcome === 'point') {
            if (!bestRoll || roll.point > bestRoll.point) {
              bestPlayer = player;
              bestRoll = roll;
            }
          }
        }

        if (bestPlayer) {
          gameState.leaderboard[bestPlayer].wins += 1;

          io.to(lobbyId).emit('round:ended', {
            round: gameState.currentRound,
            winner: bestPlayer,
            winnings: 0,
            pointsEarned: 1,
            isJackpot: false,
            leaderboard: gameState.leaderboard,
            roundResult: {
              round: gameState.currentRound,
              playerRolls: Object.fromEntries(
                Object.entries(gameState.currentRoundRolls).map(([addr, roll]) => [addr, roll.dice])
              ),
              winner: bestPlayer,
              winnings: 0
            }
          });

          // Check if game is finished
          if (gameState.currentRound >= lobby.rounds) {
            lobby.status = 'finished';
            const winner = Object.entries(gameState.leaderboard)
              .sort(([,a], [,b]) => b.wins - a.wins)[0];

            io.to(lobbyId).emit('game:ended', {
              lobby,
              overallWinner: winner[0],
              finalLeaderboard: gameState.leaderboard,
              message: `Game completed! Winner: ${winner[0]}`
            });
          } else {
            // Start next round
            gameState.currentRound += 1;
            gameState.currentPlayerIndex = 0;
            gameState.currentRoundRolls = {};

            setTimeout(() => {
              io.to(lobbyId).emit('round:started', {
                round: gameState.currentRound,
                totalRounds: lobby.rounds,
                currentPlayer: lobby.players[0].walletAddress,
                betAmount: lobby.difficulty === 'easy' ? 0.1 : 0.5
              });
            }, 3000);
          }
        } else {
          // No winner (all rerolls) - start new round
          console.log(`🔄 All players got indeterminate rolls. Starting new round.`);

          io.to(lobbyId).emit('round:tied', {
            round: gameState.currentRound,
            message: 'All players got indeterminate rolls. Starting new round.',
            playerRolls: Object.fromEntries(
              Object.entries(gameState.currentRoundRolls).map(([addr, roll]) => [addr, roll.dice])
            )
          });

          if (gameState.currentRound >= lobby.rounds) {
            // Game ends in tie
            lobby.status = 'finished';
            const winner = Object.entries(gameState.leaderboard)
              .sort(([,a], [,b]) => b.wins - a.wins)[0];

            io.to(lobbyId).emit('game:ended', {
              lobby,
              overallWinner: winner[0],
              finalLeaderboard: gameState.leaderboard,
              message: `Game completed! Winner: ${winner[0]}`
            });
          } else {
            gameState.currentRound += 1;
            gameState.currentPlayerIndex = 0;
            gameState.currentRoundRolls = {};

            setTimeout(() => {
              io.to(lobbyId).emit('round:started', {
                round: gameState.currentRound,
                totalRounds: lobby.rounds,
                currentPlayer: lobby.players[0].walletAddress,
                betAmount: lobby.difficulty === 'easy' ? 0.1 : 0.5
              });
            }, 3000);
          }
        }
      } else {
        // Continue with next player
        const currentPlayer = lobby.players[gameState.currentPlayerIndex];
        console.log(`➡️ Next player turn: ${currentPlayer.walletAddress}`);
        io.to(lobbyId).emit('round:next-player', {
          currentPlayer: currentPlayer.walletAddress,
          round: gameState.currentRound
        });
      }
    }
  });

  // Handle taunts
  socket.on('taunt:send', (data) => {
    const { lobbyId, walletAddress, soundId, soundName } = data;
    console.log(`🎵 Taunt from ${walletAddress} in lobby ${lobbyId}: ${soundName} (${soundId})`);

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      console.error(`❌ Lobby ${lobbyId} not found for taunt`);
      return;
    }

    // Verify player is in the lobby
    const player = lobby.players.find(p => p.walletAddress === walletAddress);
    if (!player) {
      console.error(`❌ Player ${walletAddress} not in lobby ${lobbyId}`);
      return;
    }

    // Allow taunts during ready and in-game phases (not just in-game)
    if (lobby.status !== 'ready' && lobby.status !== 'in-game') {
      console.log(`⚠️ Taunts not allowed during ${lobby.status} phase`);
      return;
    }

    console.log(`🎵 Broadcasting taunt from ${walletAddress.substring(0,8)} to lobby ${lobbyId}`);

    // Broadcast taunt to all players in the lobby
    io.to(lobbyId).emit('taunt:received', {
      fromPlayer: walletAddress,
      fromNickname: player.nickname || walletAddress.substring(0, 8),
      soundId,
      soundName,
      timestamp: new Date().toISOString()
    });
  });

  // Handle payment confirmation
  socket.on('lobby:payment', (data) => {
    const { lobbyId, walletAddress, signature, amount } = data;
    console.log(`💰 Payment confirmation received from ${walletAddress} in lobby ${lobbyId}`);

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      console.error(`❌ Lobby ${lobbyId} not found for payment`);
      return;
    }

    // Find the player and mark as paid
    const player = lobby.players.find(p => p.walletAddress === walletAddress);
    if (!player) {
      console.error(`❌ Player ${walletAddress} not found in lobby ${lobbyId}`);
      return;
    }

    // Mark player as paid
    player.hasPaid = true;
    player.paymentSignature = signature;
    player.paymentAmount = amount;

    console.log(`✅ Player ${walletAddress} marked as paid in lobby ${lobbyId}`);

    // Check if all players have paid
    const allPlayersPaid = lobby.players.every(p => p.hasPaid);
    const paidCount = lobby.players.filter(p => p.hasPaid).length;

    console.log(`💰 Payment status: ${paidCount}/${lobby.players.length} players paid`);

    if (allPlayersPaid) {
      lobby.status = 'ready';
      console.log(`🎮 All players paid! Lobby ${lobbyId} ready to start`);
    }

    // Broadcast updated lobby to all players in the lobby
    io.to(lobbyId).emit('lobby:updated', lobby);

    // Broadcast updated lobby list to all clients
    io.emit('lobbies:list', Array.from(lobbies.values()));
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);

    // Find and remove player from all lobbies
    for (const [lobbyId, lobby] of lobbies.entries()) {
      const playerIndex = lobby.players.findIndex(p => p.socketId === socket.id);

      if (playerIndex !== -1) {
        const removedPlayer = lobby.players[playerIndex];
        lobby.players.splice(playerIndex, 1);

        console.log(`👤 Removed player ${removedPlayer.walletAddress} from lobby ${lobbyId} due to disconnect`);

        // Update lobby status based on remaining players
        if (lobby.players.length === 0) {
          // Delete empty lobby
          lobbies.delete(lobbyId);
          console.log(`🗑️ Deleted empty lobby ${lobbyId}`);
        } else {
          // Reset lobby status if it was in payment/ready state
          if (lobby.status === 'payment' || lobby.status === 'ready') {
            lobby.status = 'waiting';
            console.log(`🔄 Reset lobby ${lobbyId} status to waiting due to player disconnect`);
          }

          // Broadcast updated lobby to remaining players
          io.to(lobbyId).emit('lobby:updated', lobby);
        }

        // Broadcast updated lobby list
        io.emit('lobbies:list', Array.from(lobbies.values()));
        break;
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ CeeloSol Backend with Socket.IO running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`🏦 House wallet: http://localhost:${PORT}/api/house-wallet`);
  console.log(`🎮 Socket.IO enabled for PVP lobbies`);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CeeloSol Backend...');
  process.exit(0);
});
