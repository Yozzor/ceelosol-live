"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLobbyHandlers = setupLobbyHandlers;
const ceelo_1 = require("../lib/ceelo");
// DEDICATED HOUSE TREASURY WALLET (SEPARATE FROM ALL USER WALLETS)
const TREASURY_ADDRESS = '8pf6SrHApuvXvZgPzYSR6am6f7bwxuK2t2PJbKHoR3VS';
// In-memory storage (in production, use Redis or database)
const lobbies = new Map();
const playerSockets = new Map(); // walletAddress -> socketId
function setupLobbyHandlers(io) {
    console.log('🎮 Setting up lobby handlers...');
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        // Handle player authentication
        socket.on('authenticate', (data) => {
            const { walletAddress, nickname } = data;
            console.log(`🔐 Player authenticated: ${walletAddress}${nickname ? ` (${nickname})` : ''}`);
            // Store player socket mapping
            playerSockets.set(walletAddress, socket.id);
            socket.data.walletAddress = walletAddress;
            socket.data.nickname = nickname;
            // Send current lobbies
            socket.emit('lobbies:list', Array.from(lobbies.values()));
        });
        // Handle lobby list requests
        socket.on('lobbies:request', () => {
            console.log(`📋 Lobby list requested by ${socket.id}`);
            socket.emit('lobbies:list', Array.from(lobbies.values()));
        });
        // Handle lobby creation
        socket.on('lobby:create', (data) => {
            const { name, difficulty, maxPlayers, totalRounds, walletAddress, nickname } = data;
            if (!walletAddress) {
                socket.emit('error', { message: 'Wallet address required' });
                return;
            }
            const lobbyId = generateLobbyId();
            const lobby = {
                id: lobbyId,
                name,
                difficulty,
                maxPlayers: Math.min(Math.max(maxPlayers, 2), 4), // 2-4 players
                totalRounds: Math.min(Math.max(totalRounds, 1), 10), // 1-10 rounds
                players: [{
                        id: walletAddress,
                        walletAddress,
                        socketId: socket.id,
                        isReady: false,
                        hasPaid: false,
                        nickname: nickname || undefined
                    }],
                status: 'waiting',
                createdAt: new Date(),
                treasuryAddress: TREASURY_ADDRESS
            };
            lobbies.set(lobbyId, lobby);
            socket.join(lobbyId);
            console.log(`🏠 Lobby created: ${lobbyId} by ${walletAddress}`);
            console.log(`🏠 Lobby players after creation:`, lobby.players);
            console.log(`🏠 Lobby status after creation:`, lobby.status);
            // Notify creator
            socket.emit('lobby:created', { lobbyId, lobby });
            // Broadcast to all clients
            io.emit('lobbies:list', Array.from(lobbies.values()));
        });
        // Handle joining lobby
        socket.on('lobby:join', (data) => {
            const { lobbyId, walletAddress, nickname } = data;
            // DEBUG: Log all received data
            console.log(`🔍 LOBBY JOIN REQUEST:`, {
                lobbyId,
                walletAddress,
                nickname,
                socketId: socket.id,
                dataType: typeof data,
                dataKeys: Object.keys(data || {}),
                walletAddressType: typeof walletAddress,
                walletAddressLength: walletAddress?.length
            });
            const lobby = lobbies.get(lobbyId);
            if (!lobby) {
                console.log(`❌ LOBBY NOT FOUND: ${lobbyId}`);
                socket.emit('error', { message: 'Lobby not found' });
                return;
            }
            console.log(`🔍 LOBBY FOUND:`, {
                id: lobby.id,
                status: lobby.status,
                currentPlayers: lobby.players.length,
                maxPlayers: lobby.maxPlayers,
                playerWallets: lobby.players.map(p => p.walletAddress)
            });
            if (lobby.status !== 'waiting') {
                console.log(`❌ LOBBY NOT WAITING: status=${lobby.status}`);
                socket.emit('error', { message: 'Lobby is not accepting players' });
                return;
            }
            if (lobby.players.length >= lobby.maxPlayers) {
                console.log(`❌ LOBBY FULL: ${lobby.players.length}/${lobby.maxPlayers}`);
                socket.emit('error', { message: 'Lobby is full' });
                return;
            }
            // Check if player already in lobby
            const existingPlayer = lobby.players.find(p => p.walletAddress === walletAddress);
            if (existingPlayer) {
                console.log(`❌ PLAYER ALREADY IN LOBBY:`, {
                    walletAddress,
                    existingPlayer: existingPlayer.walletAddress,
                    match: existingPlayer.walletAddress === walletAddress
                });
                socket.emit('error', { message: 'Already in this lobby' });
                return;
            }
            // Add player to lobby
            const newPlayer = {
                id: walletAddress,
                walletAddress,
                socketId: socket.id,
                isReady: false,
                hasPaid: false,
                nickname: nickname || undefined
            };
            console.log(`✅ ADDING PLAYER TO LOBBY:`, newPlayer);
            lobby.players.push(newPlayer);
            // Join the socket room first
            socket.join(lobbyId);
            console.log(`👥 Player ${walletAddress} joined lobby ${lobbyId} - Players now: ${lobby.players.length}/${lobby.maxPlayers}`);
            // Update lobby status if full
            if (lobby.players.length === lobby.maxPlayers) {
                lobby.status = 'payment'; // Move to payment phase when lobby is full
                console.log(`🔄 Lobby ${lobbyId} status changed to: ${lobby.status}`);
            }
            // Use setImmediate to ensure socket.join() completes before emitting
            setImmediate(() => {
                // Notify all players in lobby - emit to both the room AND directly to the joining socket
                // This ensures the joining player receives the update even if socket.join() hasn't completed yet
                console.log(`📡 Emitting lobby:updated to room ${lobbyId} with ${lobby.players.length} players`);
                console.log(`📡 Players in lobby:`, lobby.players.map(p => `${p.walletAddress.substring(0, 8)}...${p.walletAddress.substring(p.walletAddress.length - 4)}`));
                // Emit to the room (all players already in the lobby)
                io.to(lobbyId).emit('lobby:updated', lobby);
                // Also emit directly to the joining socket to ensure they get it immediately
                socket.emit('lobby:updated', lobby);
                // Additional immediate emit to ensure frontend receives the update
                // This helps with race conditions in frontend event handling
                setTimeout(() => {
                    socket.emit('lobby:updated', lobby);
                }, 10);
                // Broadcast updated lobby list to all clients
                console.log(`📡 Broadcasting updated lobby list to all clients`);
                io.emit('lobbies:list', Array.from(lobbies.values()));
            });
        });
        // Handle leaving lobby
        socket.on('lobby:leave', (data) => {
            const { lobbyId, walletAddress } = data;
            const lobby = lobbies.get(lobbyId);
            if (!lobby)
                return;
            // Remove player from lobby
            lobby.players = lobby.players.filter(p => p.walletAddress !== walletAddress);
            socket.leave(lobbyId);
            console.log(`👋 Player ${walletAddress} left lobby ${lobbyId}`);
            // If lobby is empty, delete it
            if (lobby.players.length === 0) {
                lobbies.delete(lobbyId);
                console.log(`🗑️ Empty lobby ${lobbyId} deleted`);
            }
            else {
                // Update status
                lobby.status = 'waiting';
                io.to(lobbyId).emit('lobby:updated', lobby);
            }
            // Broadcast updated lobby list
            io.emit('lobbies:list', Array.from(lobbies.values()));
        });
        // Handle payment confirmation
        socket.on('lobby:payment', (data) => {
            const { lobbyId, walletAddress, signature, amount } = data;
            const lobby = lobbies.get(lobbyId);
            if (!lobby) {
                socket.emit('error', { message: 'Lobby not found' });
                return;
            }
            if (lobby.status !== 'payment') {
                socket.emit('error', { message: 'Lobby is not in payment phase' });
                return;
            }
            const player = lobby.players.find(p => p.walletAddress === walletAddress);
            if (!player) {
                socket.emit('error', { message: 'Player not found in lobby' });
                return;
            }
            // Verify payment amount matches difficulty
            const expectedAmount = lobby.difficulty === 'easy' ? 0.1 : 0.5;
            const totalExpected = expectedAmount * lobby.totalRounds;
            if (Math.abs(amount - totalExpected) > 0.001) { // Allow small floating point differences
                socket.emit('error', {
                    message: `Payment amount incorrect. Expected ${totalExpected} SOL, received ${amount} SOL`
                });
                return;
            }
            // Mark player as paid (in production, verify signature on blockchain)
            player.hasPaid = true;
            player.paymentSignature = signature;
            console.log(`💰 Payment confirmed for ${walletAddress} in lobby ${lobbyId}: ${amount} SOL`);
            // Check if all players have paid
            const allPaid = lobby.players.every(p => p.hasPaid);
            if (allPaid) {
                lobby.status = 'ready';
                console.log(`✅ All players paid in lobby ${lobbyId}, ready to start!`);
            }
            // Notify all players in lobby
            io.to(lobbyId).emit('lobby:updated', lobby);
        });
        // Handle player ready status (only works after payment phase)
        socket.on('lobby:ready', (data) => {
            const { lobbyId, walletAddress, isReady } = data;
            const lobby = lobbies.get(lobbyId);
            if (!lobby)
                return;
            if (lobby.status !== 'ready') {
                socket.emit('error', { message: 'All players must pay before readying up' });
                return;
            }
            // Update player ready status
            const player = lobby.players.find(p => p.walletAddress === walletAddress);
            if (player && player.hasPaid) {
                player.isReady = isReady;
                // Check if all players are ready and have paid
                const allReady = lobby.players.every(p => p.isReady);
                const allPaid = lobby.players.every(p => p.hasPaid);
                if (allReady && allPaid) {
                    // Start the game!
                    startGame(lobby, io);
                }
                // Notify all players in lobby
                io.to(lobbyId).emit('lobby:updated', lobby);
            }
        });
        // Handle dice roll during game
        socket.on('game:roll', (data) => {
            try {
                const { lobbyId, walletAddress, dice } = data;
                if (!lobbyId || !walletAddress || !dice) {
                    socket.emit('error', { message: 'Missing required data for dice roll' });
                    return;
                }
                const lobby = lobbies.get(lobbyId);
                if (!lobby || lobby.status !== 'in-game' || !lobby.gameState) {
                    socket.emit('error', { message: 'Game not in progress' });
                    return;
                }
                const gameState = lobby.gameState;
                const currentPlayer = lobby.players[gameState.currentPlayerIndex];
                // Verify it's the current player's turn
                if (currentPlayer.walletAddress !== walletAddress) {
                    socket.emit('error', { message: 'Not your turn' });
                    return;
                }
                // Validate dice roll
                if (!Array.isArray(dice) || dice.length !== 3 || dice.some(d => d < 1 || d > 6)) {
                    socket.emit('error', { message: 'Invalid dice roll' });
                    return;
                }
                console.log(`🎲 Player ${walletAddress} rolled: [${dice.join(', ')}] in lobby ${lobbyId}`);
                // Resolve the dice roll - ensure proper type casting after validation
                const validatedDice = [dice[0], dice[1], dice[2]];
                const rollResult = (0, ceelo_1.resolveCeelo)(validatedDice);
                // Store the roll
                gameState.currentRoundRolls[walletAddress] = {
                    dice,
                    outcome: rollResult.outcome,
                    point: rollResult.point,
                    timestamp: new Date()
                };
                // Notify all players of the roll
                io.to(lobbyId).emit('player:rolled', {
                    player: walletAddress,
                    dice,
                    outcome: rollResult.outcome,
                    point: rollResult.point,
                    round: gameState.currentRound
                });
                // Handle the roll outcome based on new rules
                console.log(`🎯 Roll outcome: ${rollResult.outcome} for player ${walletAddress}`);
                if (rollResult.outcome === 'win' || rollResult.outcome === 'lose') {
                    // Instant win/loss - round ends immediately
                    console.log(`🏆 Instant ${rollResult.outcome}! Ending round immediately.`);
                    endRound(lobby, io, walletAddress, rollResult.outcome === 'win');
                }
                else {
                    // Point or reroll - move to next player
                    // Everyone gets one roll per round, then we compare results
                    console.log(`➡️ Moving to next player. Current rolls count: ${Object.keys(gameState.currentRoundRolls).length}/${lobby.players.length}`);
                    nextPlayer(lobby, io);
                }
            }
            catch (error) {
                console.error('❌ Error handling dice roll:', error);
                socket.emit('error', { message: 'Failed to process dice roll' });
            }
        });
        // Handle taunt sending
        socket.on('taunt:send', (data) => {
            try {
                const { lobbyId, walletAddress, soundId, soundName } = data;
                if (!lobbyId || !walletAddress || !soundId) {
                    socket.emit('error', { message: 'Missing required data for taunt' });
                    return;
                }
                const lobby = lobbies.get(lobbyId);
                if (!lobby) {
                    socket.emit('error', { message: 'Lobby not found' });
                    return;
                }
                // Verify player is in the lobby
                const player = lobby.players.find(p => p.walletAddress === walletAddress);
                if (!player) {
                    socket.emit('error', { message: 'Player not in lobby' });
                    return;
                }
                // Only allow taunts during active game
                if (lobby.status !== 'in-game') {
                    socket.emit('error', { message: 'Taunts only allowed during active games' });
                    return;
                }
                console.log(`🎵 Taunt sent by ${walletAddress.substring(0, 8)} in lobby ${lobbyId}: ${soundName} (${soundId})`);
                // Broadcast taunt to all players in the lobby
                io.to(lobbyId).emit('taunt:received', {
                    fromPlayer: walletAddress,
                    fromNickname: player.nickname,
                    soundId,
                    soundName,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ Error handling taunt:', error);
                socket.emit('error', { message: 'Failed to send taunt' });
            }
        });
        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            // Remove from player mapping
            const walletAddress = socket.data.walletAddress;
            if (walletAddress) {
                playerSockets.delete(walletAddress);
                // Remove from any lobbies
                for (const [lobbyId, lobby] of lobbies.entries()) {
                    const playerIndex = lobby.players.findIndex(p => p.walletAddress === walletAddress);
                    if (playerIndex !== -1) {
                        lobby.players.splice(playerIndex, 1);
                        if (lobby.players.length === 0) {
                            lobbies.delete(lobbyId);
                        }
                        else {
                            lobby.status = 'waiting';
                            io.to(lobbyId).emit('lobby:updated', lobby);
                        }
                        io.emit('lobbies:list', Array.from(lobbies.values()));
                        break;
                    }
                }
            }
        });
    });
}
function generateLobbyId() {
    return 'lobby_' + Math.random().toString(36).substr(2, 9);
}
function startGame(lobby, io) {
    console.log(`🎮 Starting game in lobby ${lobby.id}`);
    lobby.status = 'in-game';
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
    // Notify all players that game is starting
    io.to(lobby.id).emit('game:started', {
        lobby,
        message: `Game starting! Round 1 of ${lobby.totalRounds}`
    });
    // Start first round
    startRound(lobby, io);
}
function startRound(lobby, io) {
    const gameState = lobby.gameState;
    console.log(`🎯 Starting round ${gameState.currentRound} in lobby ${lobby.id}`);
    // Reset for new round
    gameState.currentPlayerIndex = 0;
    gameState.currentRoundRolls = {};
    // Notify all players
    io.to(lobby.id).emit('round:started', {
        round: gameState.currentRound,
        totalRounds: lobby.totalRounds,
        currentPlayer: lobby.players[0].walletAddress,
        betAmount: lobby.difficulty === 'easy' ? 0.1 : 0.5
    });
}
function nextPlayer(lobby, io) {
    const gameState = lobby.gameState;
    console.log(`🔄 nextPlayer called. Current player index: ${gameState.currentPlayerIndex}`);
    // Move to next player
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % lobby.players.length;
    console.log(`🔄 New player index: ${gameState.currentPlayerIndex}`);
    console.log(`🔄 Current round rolls: ${Object.keys(gameState.currentRoundRolls).length}/${lobby.players.length}`);
    // Check if all players have rolled
    if (Object.keys(gameState.currentRoundRolls).length === lobby.players.length) {
        // All players have rolled, determine winner
        console.log(`✅ All players have rolled! Determining round winner...`);
        determineRoundWinner(lobby, io);
    }
    else {
        // Continue with next player
        const currentPlayer = lobby.players[gameState.currentPlayerIndex];
        console.log(`➡️ Next player turn: ${currentPlayer.walletAddress}`);
        io.to(lobby.id).emit('round:next-player', {
            currentPlayer: currentPlayer.walletAddress,
            round: gameState.currentRound
        });
    }
}
function endRound(lobby, io, winner, isWin) {
    const gameState = lobby.gameState;
    const betAmount = lobby.difficulty === 'easy' ? 0.1 : 0.5;
    const totalPot = betAmount * lobby.players.length;
    console.log(`🏆 Round ${gameState.currentRound} ended. Winner: ${winner}`);
    // Calculate points based on winning combination
    const winnerRoll = gameState.currentRoundRolls[winner];
    const points = calculatePoints(winnerRoll.dice);
    // Update leaderboard with points
    gameState.leaderboard[winner].wins += points;
    console.log(`🎯 ${winner.substring(0, 8)} earned ${points} points for ${winnerRoll.dice.join('-')}`);
    // Don't add winnings yet - only at game end!
    // Store round result
    const roundResult = {
        round: gameState.currentRound,
        playerRolls: Object.fromEntries(Object.entries(gameState.currentRoundRolls).map(([addr, roll]) => [addr, roll.dice])),
        winner,
        winnings: 0 // No money awarded per round
    };
    gameState.roundResults.push(roundResult);
    // Notify all players
    io.to(lobby.id).emit('round:ended', {
        round: gameState.currentRound,
        winner,
        winnings: 0, // NO MONEY PER ROUND - only points!
        pointsEarned: points, // Send points earned this round
        isJackpot: points === 3, // Flag if this was a jackpot win
        leaderboard: gameState.leaderboard,
        roundResult
    });
    // Check if game is finished
    if (gameState.currentRound >= lobby.totalRounds) {
        endGame(lobby, io);
    }
    else {
        // Start next round
        gameState.currentRound += 1;
        setTimeout(() => startRound(lobby, io), 3000); // 3 second delay
    }
}
function determineRoundWinner(lobby, io) {
    const gameState = lobby.gameState;
    const rolls = gameState.currentRoundRolls;
    console.log(`🏆 determineRoundWinner called for round ${gameState.currentRound}`);
    console.log(`🎲 All rolls:`, Object.entries(rolls).map(([addr, roll]) => `${addr.substring(0, 8)}: ${roll.dice.join('-')} (${roll.outcome})`));
    // Check if all players have reroll outcomes (indeterminate/tie situation)
    const allRerolls = Object.values(rolls).every(roll => roll.outcome === 'reroll');
    console.log(`🔄 All rerolls? ${allRerolls}`);
    if (allRerolls) {
        console.log(`🔄 All players got indeterminate rolls in round ${gameState.currentRound}. Starting new round.`);
        // Notify players about the tie
        io.to(lobby.id).emit('round:tied', {
            round: gameState.currentRound,
            message: 'All players got indeterminate rolls. Starting new round.',
            playerRolls: Object.fromEntries(Object.entries(rolls).map(([addr, roll]) => [addr, roll.dice]))
        });
        // Check if game is finished
        if (gameState.currentRound >= lobby.totalRounds) {
            // Game ends in a tie - determine winner by total wins or random
            const leaderboard = gameState.leaderboard;
            const topPlayers = Object.entries(leaderboard)
                .sort(([, a], [, b]) => b.wins - a.wins);
            // If there's a clear winner by wins, use that
            if (topPlayers.length > 1 && topPlayers[0][1].wins > topPlayers[1][1].wins) {
                endGame(lobby, io);
            }
            else {
                // Tie game - pick random winner from tied players
                const maxWins = topPlayers[0][1].wins;
                const tiedPlayers = topPlayers.filter(([, stats]) => stats.wins === maxWins);
                const randomWinner = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)][0];
                console.log(`🎲 Game ended in tie. Random winner selected: ${randomWinner}`);
                endGame(lobby, io);
            }
        }
        else {
            // Start next round after a short delay
            gameState.currentRound += 1;
            setTimeout(() => startRound(lobby, io), 3000);
        }
        return;
    }
    // Find the best roll (normal case)
    let winner = '';
    let bestRoll = null;
    for (const [walletAddress, roll] of Object.entries(rolls)) {
        if (!bestRoll || isRollBetter(roll, bestRoll)) {
            bestRoll = roll;
            winner = walletAddress;
        }
    }
    if (winner) {
        endRound(lobby, io, winner, true);
    }
    else {
        // Fallback - this shouldn't happen but handle gracefully
        console.error('⚠️ No winner determined and not all rerolls. This should not happen.');
        console.log('Rolls:', rolls);
    }
}
function isRollBetter(roll1, roll2) {
    // Convert PlayerRoll to the format expected by compareCeeloResults
    // PlayerRoll.dice is validated to be exactly 3 numbers when stored
    const validatedDice1 = [roll1.dice[0], roll1.dice[1], roll1.dice[2]];
    const validatedDice2 = [roll2.dice[0], roll2.dice[1], roll2.dice[2]];
    const result1 = (0, ceelo_1.resolveCeelo)(validatedDice1);
    const result2 = (0, ceelo_1.resolveCeelo)(validatedDice2);
    // Use the new comparison function
    const comparison = (0, ceelo_1.compareCeeloResults)(result1, result2);
    return comparison > 0; // roll1 wins if comparison > 0
}
function endGame(lobby, io) {
    console.log(`🎉 Checking if game should end in lobby ${lobby.id}`);
    const gameState = lobby.gameState;
    const betAmount = lobby.difficulty === 'easy' ? 0.1 : 0.5;
    const totalPot = betAmount * lobby.players.length;
    // Determine overall winner by POINTS (wins), not money
    const leaderboard = gameState.leaderboard;
    const sortedPlayers = Object.entries(leaderboard)
        .sort(([, a], [, b]) => b.wins - a.wins);
    const topScore = sortedPlayers[0][1].wins;
    const tiedPlayers = sortedPlayers.filter(([, stats]) => stats.wins === topScore);
    console.log(`📊 Current scores:`, sortedPlayers.map(([addr, stats]) => `${addr.substring(0, 8)}: ${stats.wins} wins`));
    // Check if there's a tie for first place
    if (tiedPlayers.length > 1) {
        console.log(`🤝 TIE DETECTED! ${tiedPlayers.length} players tied with ${topScore} wins each`);
        console.log(`🎯 Tied players:`, tiedPlayers.map(([addr]) => addr.substring(0, 8)));
        // Notify players about the tie and continue the game
        io.to(lobby.id).emit('game:tied', {
            message: `Game tied! ${tiedPlayers.length} players have ${topScore} wins each. Playing sudden death rounds!`,
            tiedPlayers: tiedPlayers.map(([addr]) => addr),
            currentScores: leaderboard
        });
        // Continue the game with sudden death rounds
        gameState.currentRound += 1;
        console.log(`🔥 Starting sudden death round ${gameState.currentRound}`);
        setTimeout(() => startRound(lobby, io), 3000); // 3 second delay
        return; // Don't end the game yet!
    }
    // No tie - we have a clear winner!
    const overallWinner = sortedPlayers[0];
    lobby.status = 'finished';
    // Award ENTIRE pot to the final winner
    leaderboard[overallWinner[0]].totalWinnings = totalPot;
    console.log(`💰 Final winner ${overallWinner[0]} gets entire pot: ${totalPot} SOL`);
    console.log(`📊 Final scores:`, sortedPlayers.map(([addr, stats]) => `${addr.substring(0, 8)}: ${stats.wins} wins, ${stats.totalWinnings} SOL`));
    io.to(lobby.id).emit('game:ended', {
        lobby,
        overallWinner: overallWinner[0],
        finalLeaderboard: leaderboard,
        message: `Game completed! Winner: ${overallWinner[0]} wins ${totalPot} SOL!`
    });
}
/**
 * Calculate points based on the winning combination
 * Jackpot wins (triples 4-6, 4-5-6) = 3 points
 * Standard wins (pairs, points) = 1 point
 */
function calculatePoints(dice) {
    const sortedDice = [...dice].sort();
    // Check for 4-5-6 (jackpot)
    if (JSON.stringify(sortedDice) === JSON.stringify([4, 5, 6])) {
        return 3; // JACKPOT!
    }
    // Check for triples 4-6 (jackpot)
    if (sortedDice[0] === sortedDice[1] && sortedDice[1] === sortedDice[2]) {
        const tripleValue = sortedDice[0];
        if (tripleValue >= 4 && tripleValue <= 6) {
            return 3; // JACKPOT!
        }
        // Triples 1-3 are still wins, but standard points
        return 1;
    }
    // All other wins (pairs, points) = standard
    return 1;
}
