"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables FIRST
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const start_1 = require("./routes/start");
const reveal_1 = require("./routes/reveal");
const settle_1 = require("./routes/settle");
const houseWallet_1 = require("./routes/houseWallet");
const activity_1 = require("./routes/activity");
const lobbyHandlers_1 = require("./socket/lobbyHandlers");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
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
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Existing REST API Routes (PRESERVED)
app.post('/api/start', start_1.startHandler);
app.post('/api/reveal', reveal_1.revealHandler);
app.post('/api/settle', settle_1.settleHandler);
app.get('/api/house-wallet', houseWallet_1.houseWalletStatusHandler);
// Activity tracking routes (PRESERVED)
app.post('/api/activity/store', activity_1.storeGameResult);
app.get('/api/activity/wins', activity_1.getRecentWins);
app.get('/api/activity/result/:signature', activity_1.getGameResult);
app.get('/api/activity/stats', activity_1.getActivityStats);
// Socket.io setup for PVP lobbies
(0, lobbyHandlers_1.setupLobbyHandlers)(io);
// Error handling for server
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop other instances or use a different port.`);
        process.exit(1);
    }
    else {
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
exports.default = app;
