import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { startHandler } from './routes/start';
import { revealHandler } from './routes/reveal';
import { settleHandler } from './routes/settle';
import { houseWalletStatusHandler } from './routes/houseWallet';
import { storeGameResult, getRecentWins, getGameResult, getActivityStats } from './routes/activity';
import { setupLobbyHandlers } from './socket/lobbyHandlers';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [
          "https://ceelosol-live.onrender.com",
          "https://ceelosol.com",
          "https://www.ceelosol.com",
          "http://localhost:3000",
          "http://localhost:3002"
        ]
      : ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  // Production-optimized Socket.io settings
  pingTimeout: process.env.NODE_ENV === 'production' ? 120000 : 60000,
  pingInterval: process.env.NODE_ENV === 'production' ? 30000 : 25000,
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

const PORT = process.env.PORT || 3001;

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        "https://ceelosol-live.onrender.com",
        "https://ceelosol.com",
        "https://www.ceelosol.com",
        "http://localhost:3000",
        "http://localhost:3002",
        ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
        /\.railway\.app$/,
        /\.namecheap\.com$/,
        /\.namecheaphosting\.com$/,
        /\.onrender\.com$/
      ].flat()
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../public')));

// Existing REST API Routes (PRESERVED)
app.post('/api/start', startHandler);
app.post('/api/reveal', revealHandler);
app.post('/api/settle', settleHandler);
app.get('/api/house-wallet', houseWalletStatusHandler);

// Activity tracking routes (PRESERVED)
app.post('/api/activity/store', storeGameResult);
app.get('/api/activity/wins', getRecentWins);
app.get('/api/activity/result/:signature', getGameResult);
app.get('/api/activity/stats', getActivityStats);

// Socket.io setup for PVP lobbies
setupLobbyHandlers(io);

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling for server
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop other instances or use a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎮 Socket.io enabled for PVP lobbies`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS origins configured for Socket.io:`,
    process.env.NODE_ENV === 'production'
      ? ["https://ceelosol-live.onrender.com", "https://ceelosol.com", "https://www.ceelosol.com"]
      : ["http://localhost:3000", "http://localhost:3002"]
  );
  console.log(`⚡ Socket.io transports: polling, websocket`);
  console.log(`📡 Socket.io ping settings: timeout=${process.env.NODE_ENV === 'production' ? '120s' : '60s'}, interval=${process.env.NODE_ENV === 'production' ? '30s' : '25s'}`);
});

export default app;
