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
      socket.emit('lobby:error', { message: 'Lobby not found' });
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit('lobby:error', { message: 'Lobby is full' });
      return;
    }

    // Check if player is already in lobby
    const existingPlayer = lobby.players.find(p => p.walletAddress === data.walletAddress);
    if (existingPlayer) {
      socket.emit('lobby:error', { message: 'Already in lobby' });
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
    
    // Notify all clients
    io.to(data.lobbyId).emit('lobby:playerJoined', { player: newPlayer, lobby });
    io.emit('lobbies:list', Array.from(lobbies.values()));
    
    socket.emit('lobby:joined', { lobbyId: data.lobbyId, lobby });
  });
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
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
