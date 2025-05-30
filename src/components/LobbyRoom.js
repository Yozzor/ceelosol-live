import React, { useState, useEffect, useRef } from 'react';
import socketService, { formatDifficulty, calculateTotalCommitment } from '../services/SocketService';
import profileService from '../services/profileService';
import tauntService from '../services/tauntService';
import { useAuth } from '../util/auth';
import { CeeLoGame } from './CeeLoGame';
import PlayerName from './PlayerName';
import ProfileEdit from './ProfileEdit';
import GhettoRadio from './GhettoRadio';
import TauntSystem from './TauntSystem';
import TauntNotification from './TauntNotification';
import './LobbyRoom.css';

/**
 * LobbyRoom - Inside a lobby, waiting for players and playing the game
 */
export function LobbyRoom({ lobby, onLeaveLobby }) {
  const { publicKey } = useAuth();
  const [currentLobby, setCurrentLobby] = useState(lobby);

  // Debug lobby data
  console.log('🏠 LobbyRoom received lobby:', lobby);
  console.log('🏠 LobbyRoom players:', lobby?.players);
  console.log('🏠 LobbyRoom current user:', publicKey);
  const [isReady, setIsReady] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [roundState, setRoundState] = useState(null);
  const [error, setError] = useState(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [showReplayVoting, setShowReplayVoting] = useState(false);
  const [replayVotes, setReplayVotes] = useState({ votes: 0, required: 0 });
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [tauntCooldown, setTauntCooldown] = useState(0);
  const [activeTaunts, setActiveTaunts] = useState([]);
  const diceRef = useRef(null);
  const lastRollTimeRef = useRef(0);

  // Initialize profile service with current user
  useEffect(() => {
    if (publicKey) {
      profileService.setCurrentProfile(publicKey);
    }
  }, [publicKey]);

  // Update currentLobby when lobby prop changes
  useEffect(() => {
    if (lobby) {
      console.log('🏠 LobbyRoom: Updating currentLobby from prop change:', lobby);
      setCurrentLobby(lobby);
    }
  }, [lobby]);

  useEffect(() => {
    if (!lobby || !publicKey) return;

    // Set up socket event listeners
    const unsubscribeLobbyUpdated = socketService.on('lobby:updated', (updatedLobby) => {
      console.log('🏠 Lobby updated:', updatedLobby);
      setCurrentLobby(updatedLobby);

      // Update payment status based on current player
      const currentPlayer = updatedLobby.players.find(p => p.walletAddress === publicKey);
      if (currentPlayer) {
        setHasPaid(currentPlayer.hasPaid || false);
      }
    });

    const unsubscribeGameStarted = socketService.on('game:started', (data) => {
      console.log('🎮 Game started:', data);
      setGameState(data);
      setCurrentLobby(data.lobby); // Update lobby with game state
    });

    const unsubscribeRoundStarted = socketService.on('round:started', (data) => {
      console.log('🎯 Round started:', data);
      setRoundState(data);

      // Reset roll debounce for new round
      lastRollTimeRef.current = 0;

      // Check if it's my turn
      setIsMyTurn(data.currentPlayer === publicKey);
    });

    const unsubscribePlayerRolled = socketService.on('player:rolled', (data) => {
      console.log('🎲 Player rolled:', data);
      setLastRoll(data);

      // Only animate dice for OTHER players (not the player who rolled)
      // This prevents the double-roll animation issue
      if (diceRef.current && data.dice && data.player !== publicKey) {
        console.log(`🎲 Animating roll from other player: ${data.player.substring(0,8)}`);
        diceRef.current.animateRoll(data.dice);
      } else if (data.player === publicKey) {
        console.log(`🎲 Ignoring own roll animation to prevent double-roll`);
      }
    });

    const unsubscribeRoundNextPlayer = socketService.on('round:next-player', (data) => {
      console.log('➡️ Next player:', data);
      setIsMyTurn(data.currentPlayer === publicKey);
    });

    // Note: Removed reroll handler - new system doesn't use rerolls

    const unsubscribeRoundEnded = socketService.on('round:ended', (data) => {
      console.log('🏆 Round ended:', data);
      console.log('🏆 Round ended - leaderboard received:', data.leaderboard);
      console.log('🏆 Round ended - current gameState:', gameState);

      setRoundResult(data);
      setIsMyTurn(false);

      // ✅ UPDATE LIVE SCOREBOARD: Update gameState with new leaderboard
      if (data.leaderboard) {
        console.log('📊 Updating live scoreboard with:', data.leaderboard);
        console.log('📊 Current gameState structure:', gameState);

        // Always update the leaderboard regardless of structure
        setGameState(prevState => {
          console.log('📊 Previous state:', prevState);

          const newState = {
            ...prevState,
            leaderboard: data.leaderboard
          };

          console.log('📊 New state after update:', newState);
          return newState;
        });

        // Update profile stats for round win
        if (data.winner === publicKey) {
          profileService.updateRoundStats(publicKey, {
            won: true,
            isJackpot: data.isJackpot || false
          });
        } else {
          profileService.updateRoundStats(publicKey, {
            won: false,
            isJackpot: false
          });
        }
      } else {
        console.warn('⚠️ No leaderboard data received in round:ended event');
      }

      // Clear round result after 5 seconds
      setTimeout(() => {
        setRoundResult(null);
      }, 5000);
    });

    const unsubscribeRoundTied = socketService.on('round:tied', (data) => {
      console.log('🔄 Round tied:', data);
      setRoundResult({
        ...data,
        isTied: true,
        winner: null,
        message: data.message || 'All players got indeterminate rolls!'
      });
      setIsMyTurn(false);

      // Clear round result after 5 seconds
      setTimeout(() => {
        setRoundResult(null);
      }, 5000);
    });

    const unsubscribeGameTied = socketService.on('game:tied', (data) => {
      console.log('🤝 Game tied - sudden death!', data);
      setRoundResult({
        ...data,
        isTied: true,
        isGameTied: true,
        winner: null,
        message: data.message || 'Game tied! Playing sudden death rounds!'
      });
      setIsMyTurn(false);

      // Clear round result after 7 seconds (longer for game tie)
      setTimeout(() => {
        setRoundResult(null);
      }, 7000);
    });

    const unsubscribeGameEnded = socketService.on('game:ended', (data) => {
      console.log('🎉 Game ended:', data);
      setGameResult(data);
      setIsMyTurn(false);

      // Update profile stats for game completion
      if (data.finalLeaderboard && data.overallWinner) {
        const playerStats = data.finalLeaderboard[publicKey];
        if (playerStats) {
          const gameResult = {
            won: data.overallWinner === publicKey,
            winnings: playerStats.totalWinnings || 0,
            roundsWon: playerStats.wins || 0,
            roundsPlayed: currentLobby.totalRounds,
            jackpotsHit: 0 // Could be tracked separately if needed
          };

          profileService.updateGameStats(publicKey, gameResult);
          console.log('📊 Updated profile stats:', gameResult);
        }
      }

      // If game ended in a tie, show replay voting
      if (data.isTie) {
        setShowReplayVoting(true);
        setReplayVotes({ votes: 0, required: currentLobby.players.length });
      }
    });

    const unsubscribeError = socketService.on('error', (errorData) => {
      console.error('❌ Socket error:', errorData);
      setError(errorData.message);
      setTimeout(() => setError(null), 5000);
    });

    const unsubscribeTauntReceived = socketService.on('taunt:received', (data) => {
      console.log('🎵 Taunt received:', data);

      // Play the taunt sound
      tauntService.playTaunt(data.soundId);

      // Add to active taunts for notification
      const tauntId = Date.now() + Math.random();
      setActiveTaunts(prev => [...prev, { ...data, id: tauntId }]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setActiveTaunts(prev => prev.filter(t => t.id !== tauntId));
      }, 5000);
    });

    // Initialize payment status
    const currentPlayer = lobby.players.find(p => p.walletAddress === publicKey);
    if (currentPlayer) {
      setHasPaid(currentPlayer.hasPaid || false);
    }

    // Cleanup
    return () => {
      unsubscribeLobbyUpdated();
      unsubscribeGameStarted();
      unsubscribeRoundStarted();
      unsubscribePlayerRolled();
      unsubscribeRoundNextPlayer();
      unsubscribeRoundEnded();
      unsubscribeRoundTied();
      unsubscribeGameTied();
      unsubscribeGameEnded();
      unsubscribeError();
      unsubscribeTauntReceived();
    };
  }, [lobby, publicKey]);

  // Taunt cooldown timer
  useEffect(() => {
    let interval;
    if (tauntCooldown > 0) {
      interval = setInterval(() => {
        setTauntCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tauntCooldown]);

  const handleSendTaunt = (soundId, soundName) => {
    if (tauntCooldown > 0) {
      console.warn('🎵 Taunt on cooldown');
      return;
    }

    if (!tauntService.canSendTaunt()) {
      console.warn('🎵 Taunt service cooldown active');
      return;
    }

    // Send taunt via socket
    socketService.sendTaunt(currentLobby.id, publicKey, soundId, soundName);

    // Update service cooldown
    tauntService.sendTaunt(soundId);

    // Start local cooldown timer
    setTauntCooldown(30);

    console.log(`🎵 Sent taunt: ${soundName} (${soundId})`);
  };

  const handleTauntNotificationClose = (tauntId) => {
    setActiveTaunts(prev => prev.filter(t => t.id !== tauntId));
  };

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socketService.setReady(currentLobby.id, publicKey, newReadyState);
  };

  const handleLeaveLobby = () => {
    socketService.leaveLobby(currentLobby.id, publicKey);
    onLeaveLobby();
  };

  const isCurrentPlayer = (walletAddress) => {
    return walletAddress === publicKey;
  };

  const getPlayerStatus = (player) => {
    if (currentLobby.status === 'payment') {
      return player.hasPaid ? 'PAID' : 'PENDING';
    }
    if (player.isReady) return 'READY';
    return 'NOT READY';
  };

  const canStartGame = () => {
    return currentLobby.players.length === currentLobby.maxPlayers &&
           currentLobby.players.every(p => p.isReady) &&
           currentLobby.players.every(p => p.hasPaid);
  };

  const handlePayment = async () => {
    setIsPaymentProcessing(true);
    setError(null);

    try {
      const totalAmount = calculateTotalCommitment(currentLobby.difficulty, currentLobby.totalRounds);

      // In a real implementation, this would:
      // 1. Create a Solana transaction to send SOL to treasury
      // 2. Sign the transaction with user's wallet
      // 3. Send the transaction to the blockchain
      // 4. Get the transaction signature

      // For now, simulate payment with a mock signature
      const mockSignature = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send payment confirmation to backend
      socketService.confirmPayment(currentLobby.id, publicKey, mockSignature, totalAmount);

      setHasPaid(true);

    } catch (err) {
      console.error('Payment failed:', err);
      setError('Payment failed. Please try again.');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleDiceRoll = async (result) => {
    console.log('🎲 Dice rolled:', result);

    // CRITICAL: Prevent rapid successive rolls with debounce
    const now = Date.now();
    if (now - lastRollTimeRef.current < 3000) { // 3 second debounce
      console.warn('🎲 Roll ignored - too soon after last roll');
      return;
    }
    lastRollTimeRef.current = now;

    // Send dice roll to backend
    console.log('🎲 Sending roll to backend:', result.dice);
    socketService.rollDice(currentLobby.id, publicKey, result.dice);

    // Update turn state
    setIsMyTurn(false);
  };

  const handleReplayVote = () => {
    // Send replay vote to backend (would need to implement this)
    // For now, just update local state
    setReplayVotes(prev => ({
      ...prev,
      votes: prev.votes + 1
    }));

    // If all players voted, start new game
    if (replayVotes.votes + 1 >= replayVotes.required) {
      setShowReplayVoting(false);
      setGameResult(null);
      setRoundResult(null);
      // Would trigger new game start on backend
    }
  };

  const handleDeclineReplay = () => {
    setShowReplayVoting(false);
    // Could navigate back to lobby selection or show final results
  };

  if (!currentLobby) {
    return (
      <div className="lobby-room">
        <div className="error-message">
          Lobby not found
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-room">
      {/* Header */}
      <div className="lobby-room-header">
        <button className="leave-button" onClick={handleLeaveLobby}>
          ← LEAVE LOBBY
        </button>
        <h2>{currentLobby.name}</h2>
        <div className="header-actions">
          <button
            className="profile-button"
            onClick={() => setShowProfileEdit(true)}
            title="Edit Profile"
          >
            👤 Profile
          </button>
          <div className="lobby-status">
            Status: {currentLobby.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Lobby Info */}
      <div className="lobby-info-panel">
        <div className="info-grid">
          <div className="info-item">
            <label>Difficulty:</label>
            <span>{formatDifficulty(currentLobby.difficulty)}</span>
          </div>
          <div className="info-item">
            <label>Total Rounds:</label>
            <span>{currentLobby.totalRounds}</span>
          </div>
          <div className="info-item">
            <label>Players:</label>
            <span>{currentLobby.players.length}/{currentLobby.maxPlayers}</span>
          </div>
          <div className="info-item">
            <label>Your Commitment:</label>
            <span>{calculateTotalCommitment(currentLobby.difficulty, currentLobby.totalRounds).toFixed(1)} SOL</span>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="players-section">
        <h3>PLAYERS</h3>
        <div className="players-list">
          {currentLobby.players.map((player, index) => (
            <div
              key={player.walletAddress}
              className={`player-card ${isCurrentPlayer(player.walletAddress) ? 'current-player' : ''} ${player.isReady ? 'ready' : 'not-ready'}`}
            >
              <div className="player-info">
                <div className="player-name">
                  <PlayerName
                    walletAddress={player.walletAddress}
                    currentUserAddress={publicKey}
                    showYou={true}
                    maxLength={15}
                    nickname={player.nickname}
                  />
                </div>
                <div className="player-address">
                  {player.walletAddress.substring(0, 8)}...{player.walletAddress.substring(player.walletAddress.length - 8)}
                </div>
              </div>
              <div className={`player-status ${player.isReady ? 'ready' : 'not-ready'}`}>
                {getPlayerStatus(player)}
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: currentLobby.maxPlayers - currentLobby.players.length }).map((_, index) => (
            <div key={`empty-${index}`} className="player-card empty-slot">
              <div className="player-info">
                <div className="player-name">Waiting for player...</div>
              </div>
              <div className="player-status empty">
                EMPTY
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Controls */}
      {currentLobby.status === 'waiting' ? (
        <div className="game-controls">
          <div className="waiting-section">
            {currentLobby.players.length < currentLobby.maxPlayers ? (
              <>
                <p>🔄 Waiting for {currentLobby.maxPlayers - currentLobby.players.length} more player(s) to join...</p>
                <small>Share the lobby name "{currentLobby.name}" with friends!</small>
              </>
            ) : (
              <p>✅ Lobby is full! Moving to payment phase...</p>
            )}
          </div>
        </div>
      ) : currentLobby.status === 'payment' ? (
        <div className="game-controls">
          <div className="payment-section">
            <h3>💰 PAYMENT REQUIRED</h3>
            <div className="payment-info">
              <p>Total commitment: <strong>{calculateTotalCommitment(currentLobby.difficulty, currentLobby.totalRounds)} SOL</strong></p>
              <p>Treasury address: <code>{currentLobby.treasuryAddress}</code></p>
              <small>Send the exact amount to the treasury address to continue</small>
            </div>

            {!hasPaid ? (
              <button
                className="payment-button"
                onClick={handlePayment}
                disabled={isPaymentProcessing}
              >
                {isPaymentProcessing ? '⏳ PROCESSING...' : '💰 CONFIRM PAYMENT'}
              </button>
            ) : (
              <div className="payment-confirmed">
                <p>✅ Payment confirmed! Waiting for other players...</p>
              </div>
            )}

            <div className="payment-status">
              <p>Players paid: {currentLobby.players.filter(p => p.hasPaid).length}/{currentLobby.players.length}</p>
            </div>
          </div>
        </div>
      ) : currentLobby.status === 'ready' ? (
        <div className="game-controls">
          <div className="ready-section">
            <button
              className={`ready-button ${isReady ? 'ready' : 'not-ready'}`}
              onClick={handleReadyToggle}
            >
              {isReady ? '✅ READY' : '⏳ NOT READY'}
            </button>
            <p className="ready-info">
              {canStartGame() ?
                '🎮 All players ready! Game will start automatically...' :
                `⏳ Waiting for ${currentLobby.players.filter(p => !p.isReady).length} player(s) to ready up`
              }
            </p>
          </div>
        </div>
      ) : gameState ? (
        <div className="game-interface">
          <div className="game-header">
            <h3>🎮 ROUND {roundState?.round || gameState.lobby.gameState?.currentRound || 1} OF {currentLobby.totalRounds}</h3>
            <div className="round-info">
              <span>Pot: {(roundState?.betAmount || (currentLobby.difficulty === 'easy' ? 0.1 : 0.5)) * currentLobby.players.length} SOL</span>
            </div>
          </div>

          {/* Live Scoreboard */}
          <div className="live-scoreboard">
            <h4>📊 LIVE SCORES</h4>
            <div className="scoreboard-entries">
              {(() => {
                // Use the leaderboard directly from gameState
                const leaderboard = gameState?.leaderboard || {};

                console.log('📊 Displaying leaderboard from gameState:', leaderboard);
                console.log('📊 Full gameState for reference:', gameState);

                const entries = Object.entries(leaderboard);
                console.log('📊 Leaderboard entries:', entries);

                if (entries.length === 0) {
                  console.log('📊 No leaderboard entries found');
                  return (
                    <div className="no-scores">
                      <span>No scores yet...</span>
                    </div>
                  );
                }

                return entries
                  .sort(([,a], [,b]) => b.wins - a.wins)
                  .map(([address, stats], index) => (
                    <div key={address} className={`score-entry ${address === publicKey ? 'you' : ''} ${index === 0 && stats.wins > 0 ? 'leading' : ''}`}>
                      <span className="player-name">
                        <PlayerName
                          walletAddress={address}
                          currentUserAddress={publicKey}
                          showYou={true}
                          maxLength={12}
                        />
                      </span>
                      <span className="points">{stats.wins} pts</span>
                      {index === 0 && stats.wins > 0 && <span className="leader-badge">👑</span>}
                    </div>
                  ));
              })()}
            </div>
            <div className="scoring-info">
              <span>🎯 Standard Win: +1 pt</span>
              <span>🎰 Jackpot: +3 pts</span>
            </div>
          </div>

          {/* Current Turn Indicator */}
          <div className="turn-indicator">
            {isMyTurn ? (
              <div className="my-turn">
                🎯 <strong>YOUR TURN!</strong> Roll the dice!
              </div>
            ) : (
              <div className="waiting-turn">
                ⏳ Waiting for {roundState?.currentPlayer ? (
                  <PlayerName
                    walletAddress={roundState.currentPlayer}
                    currentUserAddress={publicKey}
                    showYou={true}
                    maxLength={15}
                    nickname={currentLobby.players.find(p => p.walletAddress === roundState.currentPlayer)?.nickname}
                  />
                ) : 'other player'} to roll...
              </div>
            )}
          </div>

          {/* Dice Game Component */}
          <CeeLoGame
            ref={diceRef}
            onResult={handleDiceRoll}
            disabled={!isMyTurn}
            disabledReason={isMyTurn ? '' : 'Wait for your turn'}
          />

          {/* Taunt System */}
          <div className="taunt-section">
            <TauntSystem
              isVisible={true}
              onSendTaunt={handleSendTaunt}
              cooldownRemaining={tauntCooldown}
              isDisabled={false}
            />
          </div>

          {/* Players Status in Game */}
          <div className="game-players">
            <h4>Players in Round</h4>
            <div className="game-players-list">
              {currentLobby.players.map((player, index) => (
                <div
                  key={player.walletAddress}
                  className={`game-player-card ${player.walletAddress === roundState?.currentPlayer ? 'current-turn' : ''} ${player.walletAddress === publicKey ? 'you' : ''}`}
                >
                  <div className="player-name">
                    <PlayerName
                      walletAddress={player.walletAddress}
                      currentUserAddress={publicKey}
                      showYou={true}
                      maxLength={15}
                      nickname={player.nickname}
                    />
                  </div>
                  <div className="player-address">
                    {player.walletAddress.substring(0, 8)}...{player.walletAddress.substring(player.walletAddress.length - 8)}
                  </div>
                  {player.walletAddress === roundState?.currentPlayer && (
                    <div className="turn-indicator-badge">🎯 ROLLING</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="game-in-progress">
          <h3>🎮 GAME IN PROGRESS</h3>
          <p>The multi-round game is currently being played...</p>
        </div>
      )}

      {/* Round Result Notification */}
      {roundResult && (
        <div className="round-notification">
          {roundResult.isTied ? (
            <div className={`round-notification-content ${roundResult.isGameTied ? 'game-tied' : 'tied'}`}>
              <div className="notification-header">
                <span className="notification-icon">{roundResult.isGameTied ? '🔥' : '🔄'}</span>
                <span className="notification-title">
                  {roundResult.isGameTied ? 'GAME TIED - SUDDEN DEATH!' : 'ROUND TIED!'}
                </span>
              </div>
              <div className="notification-message">
                {roundResult.isGameTied ?
                  'Players are tied! Playing sudden death rounds until there\'s a winner!' :
                  `All players got indeterminate rolls. ${roundResult.round >= currentLobby.totalRounds ? 'Game ending...' : 'Next round starting...'}`
                }
              </div>
            </div>
          ) : (
            <div className="round-notification-content winner">
              <div className="notification-header">
                <span className="notification-icon">{roundResult.isJackpot ? '🎰' : '🏆'}</span>
                <span className="notification-title">
                  {roundResult.winner === publicKey ? 'YOU WON!' : (
                    <>
                      <PlayerName
                        walletAddress={roundResult.winner}
                        currentUserAddress={publicKey}
                        showYou={true}
                        maxLength={15}
                        nickname={currentLobby.players.find(p => p.walletAddress === roundResult.winner)?.nickname}
                      /> WINS!
                    </>
                  )}
                </span>
              </div>
              <div className="notification-details">
                <span className="points-badge">
                  {roundResult.isJackpot ? '+3 POINTS' : '+1 POINT'}
                </span>
                <span className="round-counter">
                  Round {roundResult.round} of {currentLobby.totalRounds}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game End Result Modal */}
      {gameResult && (
        <div className="modal-overlay">
          <div className="result-modal game-end">
            <h2>🎉 GAME COMPLETED!</h2>
            <div className="overall-winner">
              <h3>Overall Winner:</h3>
              <div className="winner-name">
                {gameResult.overallWinner === publicKey ? 'YOU WON THE GAME!' : (
                  <>
                    <PlayerName
                      walletAddress={gameResult.overallWinner}
                      currentUserAddress={publicKey}
                      showYou={true}
                      maxLength={15}
                      nickname={currentLobby.players.find(p => p.walletAddress === gameResult.overallWinner)?.nickname}
                    /> WINS THE GAME!
                  </>
                )}
              </div>
            </div>

            <div className="final-leaderboard">
              <h4>Final Leaderboard:</h4>
              {Object.entries(gameResult.finalLeaderboard || {})
                .sort(([,a], [,b]) => b.totalWinnings - a.totalWinnings)
                .map(([address, stats], index) => (
                  <div key={address} className={`leaderboard-entry ${address === publicKey ? 'you' : ''}`}>
                    <span className="rank">#{index + 1}</span>
                    <span className="player">
                      <PlayerName
                        walletAddress={address}
                        currentUserAddress={publicKey}
                        showYou={true}
                        maxLength={12}
                        nickname={currentLobby.players.find(p => p.walletAddress === address)?.nickname}
                      />
                    </span>
                    <span className="wins">{stats.wins} wins</span>
                    <span className="winnings">{stats.totalWinnings} SOL</span>
                  </div>
                ))}
            </div>

            <div className="game-actions">
              <button className="leave-game-button" onClick={handleLeaveLobby}>
                LEAVE GAME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replay Voting Modal */}
      {showReplayVoting && (
        <div className="modal-overlay">
          <div className="result-modal replay-voting">
            <h2>🔄 PLAY AGAIN?</h2>
            <p>The game ended in a tie! Would you like to play another round?</p>

            <div className="voting-status">
              <p>Votes to replay: {replayVotes.votes} / {replayVotes.required}</p>
              <div className="vote-progress">
                <div
                  className="vote-bar"
                  style={{ width: `${(replayVotes.votes / replayVotes.required) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="voting-actions">
              <button className="vote-yes" onClick={handleReplayVote}>
                ✅ YES, PLAY AGAIN
              </button>
              <button className="vote-no" onClick={handleDeclineReplay}>
                ❌ NO, END GAME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ProfileEdit
          walletAddress={publicKey}
          onClose={() => setShowProfileEdit(false)}
          onSave={(updatedProfile) => {
            console.log('Profile updated:', updatedProfile);
            setShowProfileEdit(false);
          }}
        />
      )}

      {/* Game Rules Reminder */}
      <div className="rules-reminder">
        <h4>🎲 NEW CEE-LO RULES</h4>
        <div className="rules-grid">
          <div className="rule-item win">4-5-6 = INSTANT WIN</div>
          <div className="rule-item win">Triples = INSTANT WIN (6-6-6 > 5-5-5 > ...)</div>
          <div className="rule-item lose">1-2-3 = INSTANT LOSS</div>
          <div className="rule-item point">Pair + Odd = POINT (6 > 5 > 4 > 3 > 2)</div>
          <div className="rule-item reroll">Else = INDETERMINATE</div>
        </div>
        <p className="rules-note">
          <strong>New System:</strong> Everyone rolls once per round, then results are compared using Cee-Lo hierarchy. No more endless rerolling!
        </p>
      </div>

      {/* Ghetto Radio */}
      <GhettoRadio />

      {/* Taunt Notifications */}
      {activeTaunts.map((taunt) => (
        <TauntNotification
          key={taunt.id}
          taunt={taunt}
          currentUserAddress={publicKey}
          onClose={() => handleTauntNotificationClose(taunt.id)}
        />
      ))}
    </div>
  );
}
