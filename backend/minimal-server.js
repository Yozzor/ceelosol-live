const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const web3 = require('@solana/web3.js');
const bs58 = require('bs58');

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
const HOUSE_WALLET_ADDRESS = '3WgTYUtNQhoi2sUXE4fh8GQ1cCFxkTcdjXLyxxJ7ympu';

// Initialize Solana connection and treasury wallet
const connection = new web3.Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

let treasuryKeypair = null;

// Initialize treasury wallet from environment
function initializeTreasuryWallet() {
  const bankerSecretKey = process.env.BANKER_SECRET_KEY;

  if (bankerSecretKey && bankerSecretKey.trim() !== '') {
    try {
      const secretKeyBytes = bs58.decode(bankerSecretKey);
      treasuryKeypair = web3.Keypair.fromSecretKey(secretKeyBytes);
      console.log('✅ Treasury wallet loaded from environment');
      console.log('🏦 Treasury address:', treasuryKeypair.publicKey.toBase58());

      // Verify it matches our expected address
      if (treasuryKeypair.publicKey.toBase58() !== HOUSE_WALLET_ADDRESS) {
        console.warn('⚠️ Treasury keypair address does not match expected HOUSE_WALLET_ADDRESS');
      }
    } catch (error) {
      console.error('❌ Failed to load treasury wallet:', error);
      console.log('💰 Treasury operations will be disabled');
    }
  } else {
    console.log('⚠️ BANKER_SECRET_KEY not found - treasury operations disabled');
    console.log('💡 Add BANKER_SECRET_KEY to environment variables to enable real SOL transactions');
  }
}

// Initialize treasury on startup
initializeTreasuryWallet();

// Treasury payout function
async function processWinnerPayout(winnerAddress, totalPot, lobbyId) {
  if (!treasuryKeypair) {
    console.log(`💰 Treasury wallet not available - simulating payout of ${totalPot} SOL to ${winnerAddress}`);
    return {
      success: true,
      simulated: true,
      amount: totalPot,
      signature: `simulated_${Date.now()}`
    };
  }

  try {
    const winnerPubkey = new web3.PublicKey(winnerAddress);
    const payoutLamports = Math.floor(totalPot * web3.LAMPORTS_PER_SOL);

    // Check treasury balance
    const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey);
    console.log(`🏦 Treasury balance: ${treasuryBalance / web3.LAMPORTS_PER_SOL} SOL`);

    if (treasuryBalance < payoutLamports) {
      console.error(`❌ Insufficient treasury funds! Need ${totalPot} SOL, have ${treasuryBalance / web3.LAMPORTS_PER_SOL} SOL`);
      return {
        success: false,
        error: 'Insufficient treasury funds',
        required: totalPot,
        available: treasuryBalance / web3.LAMPORTS_PER_SOL
      };
    }

    // Create payout transaction
    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: winnerPubkey,
        lamports: payoutLamports,
      })
    );

    // Get recent blockhash and sign
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;
    transaction.sign(treasuryKeypair);

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature);

    console.log(`💰 Payout successful! Sent ${totalPot} SOL to ${winnerAddress}`);
    console.log(`📝 Transaction signature: ${signature}`);

    return {
      success: true,
      amount: totalPot,
      signature: signature,
      lamports: payoutLamports
    };

  } catch (error) {
    console.error(`❌ Payout failed for lobby ${lobbyId}:`, error);
    return {
      success: false,
      error: error.message || 'Transaction failed'
    };
  }
}

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
app.get('/api/house-wallet', async (req, res) => {
  try {
    let balance = 0;
    let balanceInSOL = 0;

    // Get real balance if treasury wallet is available
    if (treasuryKeypair) {
      try {
        balance = await connection.getBalance(treasuryKeypair.publicKey);
        balanceInSOL = balance / web3.LAMPORTS_PER_SOL;
      } catch (error) {
        console.error('Error fetching treasury balance:', error);
      }
    }

    res.json({
      success: true,
      houseWallet: {
        publicKey: HOUSE_WALLET_ADDRESS,
        balance: balance,
        balanceInSOL: balanceInSOL
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
    console.log(`🏠 Lobby creation data received:`, {
      name: data.name,
      difficulty: data.difficulty,
      maxPlayers: data.maxPlayers,
      totalRounds: data.totalRounds,
      rounds: data.rounds,
      walletAddress: data.walletAddress
    });

    const lobbyId = Date.now().toString();
    const lobby = {
      id: lobbyId,
      name: data.name || 'New Lobby',
      maxPlayers: data.maxPlayers || 4,
      betAmount: data.betAmount || 0.1,
      rounds: data.totalRounds || data.rounds || 5, // Fix: Use totalRounds from frontend, fallback to rounds, then default to 5
      totalRounds: data.totalRounds || data.rounds || 5, // Add totalRounds field for consistency
      difficulty: data.difficulty || 'easy',
      treasuryAddress: HOUSE_WALLET_ADDRESS,
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
    console.log(`🏠 Lobby created: ${lobbyId} by ${data.walletAddress} with ${lobby.totalRounds} rounds`);
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

  // Handle leaving lobby
  socket.on('lobby:leave', (data) => {
    const { lobbyId, walletAddress } = data;
    console.log(`👋 Player ${walletAddress} attempting to leave lobby ${lobbyId}`);

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      console.log(`❌ Lobby ${lobbyId} not found for leave request`);
      return;
    }

    // Remove player from lobby
    const initialPlayerCount = lobby.players.length;
    lobby.players = lobby.players.filter(p => p.walletAddress !== walletAddress);
    const finalPlayerCount = lobby.players.length;

    // Leave the socket room
    socket.leave(lobbyId);

    console.log(`👋 Player ${walletAddress} left lobby ${lobbyId} (${initialPlayerCount} -> ${finalPlayerCount} players)`);

    // If lobby is empty, delete it
    if (lobby.players.length === 0) {
      lobbies.delete(lobbyId);
      console.log(`🗑️ Empty lobby ${lobbyId} deleted`);
    } else {
      // Reset lobby status to waiting if it was in payment/ready state
      if (lobby.status === 'payment' || lobby.status === 'ready') {
        lobby.status = 'waiting';
        console.log(`🔄 Reset lobby ${lobbyId} status to waiting due to player leave`);
      }

      // Broadcast updated lobby to remaining players
      io.to(lobbyId).emit('lobby:updated', lobby);
    }

    // Broadcast updated lobby list to all clients
    io.emit('lobbies:list', Array.from(lobbies.values()));
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
        message: `Game starting! Round 1 of ${lobby.totalRounds}`
      });

      // Start first round
      setTimeout(() => {
        io.to(lobbyId).emit('round:started', {
          round: 1,
          totalRounds: lobby.totalRounds,
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

    // CRITICAL: Check if player has already rolled this round
    if (gameState.currentRoundRolls[walletAddress]) {
      console.error(`❌ Player ${walletAddress} has already rolled this round!`);
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
      if (gameState.currentRound >= lobby.totalRounds && !gameState.suddenDeath?.active) {
        // Check for ties and handle sudden death
        checkGameEndAndHandleTies(lobby, io);
      } else if (gameState.suddenDeath?.active) {
        // In sudden death mode, check if we have a winner
        checkGameEndAndHandleTies(lobby, io);
      } else {
        // Start next round
        gameState.currentRound += 1;
        gameState.currentPlayerIndex = 0;
        gameState.currentRoundRolls = {};

        setTimeout(() => {
          io.to(lobbyId).emit('round:started', {
            round: gameState.currentRound,
            totalRounds: lobby.totalRounds,
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
          if (gameState.currentRound >= lobby.totalRounds && !gameState.suddenDeath?.active) {
            // Check for ties and handle sudden death
            checkGameEndAndHandleTies(lobby, io);
          } else if (gameState.suddenDeath?.active) {
            // In sudden death mode, check if we have a winner
            checkGameEndAndHandleTies(lobby, io);
          } else {
            // Start next round
            gameState.currentRound += 1;
            gameState.currentPlayerIndex = 0;
            gameState.currentRoundRolls = {};

            setTimeout(() => {
              io.to(lobbyId).emit('round:started', {
                round: gameState.currentRound,
                totalRounds: lobby.totalRounds,
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

          if (gameState.currentRound >= lobby.totalRounds && !gameState.suddenDeath?.active) {
            // Check for ties and handle sudden death
            checkGameEndAndHandleTies(lobby, io);
          } else if (gameState.suddenDeath?.active) {
            // In sudden death mode, continue until someone wins
            gameState.suddenDeath.round += 1;
            startSuddenDeathRound(lobby, io);
          } else {
            gameState.currentRound += 1;
            gameState.currentPlayerIndex = 0;
            gameState.currentRoundRolls = {};

            setTimeout(() => {
              io.to(lobbyId).emit('round:started', {
                round: gameState.currentRound,
                totalRounds: lobby.totalRounds,
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

// Function to check for ties and handle sudden death
function checkGameEndAndHandleTies(lobby, io) {
  const gameState = lobby.gameState;
  const leaderboard = gameState.leaderboard;

  // Get all players sorted by wins (descending)
  const sortedPlayers = Object.entries(leaderboard)
    .sort(([,a], [,b]) => b.wins - a.wins);

  const topScore = sortedPlayers[0][1].wins;
  const playersWithTopScore = sortedPlayers.filter(([,player]) => player.wins === topScore);

  console.log(`🏆 Game end check - Top score: ${topScore}, Players with top score: ${playersWithTopScore.length}`);

  if (playersWithTopScore.length > 1) {
    // TIE DETECTED! Start sudden death
    console.log(`🤝 TIE DETECTED! ${playersWithTopScore.length} players tied with ${topScore} wins each`);
    console.log(`🔥 Starting SUDDEN DEATH rounds!`);

    // Initialize sudden death mode
    if (!gameState.suddenDeath) {
      gameState.suddenDeath = {
        active: true,
        round: 1,
        tiedPlayers: playersWithTopScore.map(([addr]) => addr)
      };
    }

    // Notify players about sudden death
    io.to(lobby.id).emit('game:tied', {
      lobby,
      tiedPlayers: playersWithTopScore.map(([addr]) => addr),
      tiedScore: topScore,
      suddenDeathRound: gameState.suddenDeath.round,
      message: `Game tied! ${playersWithTopScore.length} players with ${topScore} wins each. Starting sudden death round ${gameState.suddenDeath.round}!`,
      finalLeaderboard: leaderboard
    });

    // Start sudden death round after 5 seconds
    setTimeout(() => {
      startSuddenDeathRound(lobby, io);
    }, 5000);

  } else {
    // Clear winner - end game normally and process payout
    const winner = sortedPlayers[0];
    lobby.status = 'finished';

    console.log(`🏆 Game completed! Winner: ${winner[0]} with ${winner[1].wins} wins`);

    // Calculate total pot (all players' commitments)
    const betAmount = lobby.difficulty === 'easy' ? 0.1 : 0.5;
    const totalPot = betAmount * lobby.players.length * lobby.totalRounds;

    console.log(`💰 Processing winner payout: ${totalPot} SOL to ${winner[0]}`);

    // Process payout asynchronously
    processWinnerPayout(winner[0], totalPot, lobby.id).then(payoutResult => {
      console.log(`💰 Payout result for ${winner[0]}:`, payoutResult);

      // Emit game ended with payout information
      io.to(lobby.id).emit('game:ended', {
        lobby,
        overallWinner: winner[0],
        finalLeaderboard: leaderboard,
        message: `Game completed! Winner: ${winner[0]} with ${winner[1].wins} wins!`,
        payout: payoutResult
      });
    }).catch(error => {
      console.error('❌ Payout processing error:', error);

      // Still emit game ended even if payout fails
      io.to(lobby.id).emit('game:ended', {
        lobby,
        overallWinner: winner[0],
        finalLeaderboard: leaderboard,
        message: `Game completed! Winner: ${winner[0]} with ${winner[1].wins} wins!`,
        payout: { success: false, error: 'Payout failed' }
      });
    });
  }
}

// Function to start a sudden death round
function startSuddenDeathRound(lobby, io) {
  const gameState = lobby.gameState;

  // Reset round state for sudden death
  gameState.currentRound += 1;
  gameState.currentPlayerIndex = 0;
  gameState.currentRoundRolls = {};

  console.log(`🔥 Starting sudden death round ${gameState.suddenDeath.round}`);

  io.to(lobby.id).emit('round:started', {
    round: gameState.currentRound,
    totalRounds: lobby.totalRounds,
    currentPlayer: lobby.players[0].walletAddress,
    betAmount: lobby.difficulty === 'easy' ? 0.1 : 0.5,
    isSuddenDeath: true,
    suddenDeathRound: gameState.suddenDeath.round,
    message: `Sudden Death Round ${gameState.suddenDeath.round} - Winner takes all!`
  });
}

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
