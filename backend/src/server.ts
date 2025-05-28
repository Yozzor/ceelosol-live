import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
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
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.ALLOWED_ORIGINS?.split(',') || [],
        /\.railway\.app$/,
        /\.namecheap\.com$/,
        /\.namecheaphosting\.com$/
      ].flat()
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

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
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io enabled for PVP lobbies`);
});

export default app;
