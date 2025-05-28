# CeeloSol Backend

Backend server for the CeeloSol gambling game with PVP lobby support.

## Recent Fixes (Game/Server Crasher Issues)

### Issues Resolved:
1. **TypeScript Compilation Error**: Fixed type casting issues in `lobbyHandlers.ts` where `dice` array was incorrectly cast to `DiceRoll` tuple
2. **ts-node Installation Issues**: Reinstalled dependencies to fix missing ts-node binaries
3. **Port Conflicts**: Added proper error handling for `EADDRINUSE` errors
4. **Server Crashes**: Added try-catch blocks and graceful shutdown handling
5. **Type Safety**: Improved dice validation and type casting throughout the codebase

### Key Changes:
- Fixed `resolveCeelo()` function calls with proper type casting
- Added comprehensive error handling in socket handlers
- Implemented graceful shutdown on SIGINT/SIGTERM
- Created server manager script to prevent port conflicts
- Added proper validation for all socket event data

## Quick Start

### Development Mode
```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Start development server (recommended)
pnpm server

# Or start directly
pnpm dev
```

### Production Mode
```bash
# Build and start production server
pnpm build
pnpm server:prod

# Or start directly
pnpm start
```

## Server Manager

The server manager script (`scripts/server-manager.js`) helps prevent common issues:

- **Port Conflict Detection**: Automatically detects if port 3001 is in use
- **Process Cleanup**: Kills existing processes on the port before starting
- **Graceful Shutdown**: Handles CTRL+C properly
- **Cross-Platform**: Works on Windows and Unix systems

### Usage:
```bash
# Start in development mode (default)
pnpm server

# Start in production mode
pnpm server:prod

# Get help
node scripts/server-manager.js --help
```

## API Endpoints

### REST API
- `POST /api/start` - Start a new game
- `POST /api/reveal` - Reveal dice roll
- `POST /api/settle` - Settle game results
- `GET /api/house-wallet` - Get house wallet status
- `POST /api/activity/store` - Store game result
- `GET /api/activity/wins` - Get recent wins
- `GET /api/activity/result/:signature` - Get specific game result
- `GET /api/activity/stats` - Get activity statistics

### Socket.IO Events
- `lobby:create` - Create a new PVP lobby
- `lobby:join` - Join an existing lobby
- `lobby:leave` - Leave a lobby
- `lobby:payment` - Confirm payment for lobby
- `game:roll` - Submit dice roll during game
- `lobbies:list` - Request lobby list

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
BANKER_SECRET_KEY=your_house_wallet_private_key_here
HOUSE_EDGE=0.03
```

## Troubleshooting

### Port Already in Use
If you get `EADDRINUSE` errors:
```bash
# Use the server manager (recommended)
pnpm server

# Or manually kill processes on Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Or on Unix/Mac
lsof -ti :3001 | xargs kill -9
```

### TypeScript Compilation Errors
```bash
# Clean build
rm -rf dist/
pnpm build
```

### ts-node Issues
```bash
# Reinstall dependencies
pnpm install --force
```

## Architecture

- **Express.js** - REST API server
- **Socket.IO** - Real-time PVP lobby communication
- **TypeScript** - Type-safe development
- **Solana Web3.js** - Blockchain integration

## Game Logic

The server implements the Cee-Lo dice game rules:
- **4-5-6 or Triples**: Instant win (3 points for jackpot combinations)
- **1-2-3**: Instant loss
- **Pair + Odd**: Point value (1 point)
- **Other combinations**: Reroll

PVP games use a point-based system where only the final winner receives the entire pot.
