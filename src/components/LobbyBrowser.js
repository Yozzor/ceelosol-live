import React, { useState, useEffect } from 'react';
import socketService, { formatDifficulty, formatLobbyStatus, calculateTotalCommitment } from '../services/SocketService';
import { useAuth } from '../util/auth';
import './LobbyBrowser.css';

/**
 * LobbyBrowser - Browse and join existing lobbies or create new ones
 */
export function LobbyBrowser({ onBackToModeSelect, onJoinLobby }) {
  const { publicKey, isAuthenticated } = useAuth();
  const [lobbies, setLobbies] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Debug authentication state
  console.log('🔍 LobbyBrowser Auth State:', {
    isAuthenticated,
    publicKey,
    hasPublicKey: !!publicKey,
    publicKeyLength: publicKey?.length,
    localStorage_pub: localStorage.getItem('ceelo_pub'),
    sessionStorage_auth: sessionStorage.getItem('ceelo_authorized_wallet')
  });

  // Fallback: Use localStorage public key if auth hook doesn't provide one
  const effectivePublicKey = publicKey || localStorage.getItem('ceelo_pub');
  console.log('🔑 Using effective public key:', effectivePublicKey);

  // Create lobby form state
  const [createForm, setCreateForm] = useState({
    name: '',
    difficulty: 'easy',
    maxPlayers: 3,
    totalRounds: 5
  });

  useEffect(() => {
    // Connect to socket service only if we have a public key and aren't already connected
    if (effectivePublicKey) {
      console.log('🔌 LobbyBrowser: Setting up socket connection for:', effectivePublicKey);

      // Check if already connected to the same wallet
      const currentStatus = socketService.getConnectionStatus();
      if (currentStatus.isConnected && currentStatus.currentWallet === effectivePublicKey) {
        console.log('🔌 Already connected to same wallet, reusing connection');
        setIsConnected(true);
        setError(null);
        // Request lobbies since we're already connected
        socketService.requestLobbies();
      } else {
        // Connect to socket service
        console.log('🔌 Establishing new socket connection...');
        socketService.connect(effectivePublicKey);
      }

      // Set up event listeners
      const unsubscribeLobbies = socketService.on('lobbies:list', (lobbyList) => {
        console.log('📋 Received lobby list:', lobbyList);
        setLobbies(lobbyList);
      });

      const unsubscribeError = socketService.on('error', (errorData) => {
        // Handle socket errors gracefully
        if (errorData.maxRetriesReached) {
          setError('PVP lobbies temporarily unavailable');
        } else {
          setError(errorData.message || 'Connection issue');
        }
        setTimeout(() => setError(null), 8000);
      });

      const unsubscribeLobbyCreated = socketService.on('lobby:created', (data) => {
        console.log('🏠 Lobby created:', data);
        setShowCreateForm(false);
        // Join the created lobby
        if (onJoinLobby) {
          onJoinLobby(data.lobbyId, data.lobby);
        }
      });

      // Listen for connection status changes
      const unsubscribeConnect = socketService.on('connect', () => {
        console.log('🟢 Socket connected - updating UI state');
        setIsConnected(true);
        setError(null);
      });

      const unsubscribeDisconnect = socketService.on('disconnect', () => {
        console.log('🔴 Socket disconnected - updating UI state');
        setIsConnected(false);
        setError('PVP lobbies temporarily unavailable');
      });

      // Single connection status check after a reasonable delay
      const connectionCheckTimeout = setTimeout(() => {
        const status = socketService.getConnectionStatus();
        console.log('🔍 LobbyBrowser connection status check:', status);
        setIsConnected(status.isConnected);

        // If not connected after initial delay, show user-friendly message
        if (!status.isConnected && !status.isConnecting) {
          setError('PVP lobbies temporarily unavailable');
        }
      }, 2000);

      // Cleanup
      return () => {
        clearTimeout(connectionCheckTimeout);
        unsubscribeLobbies();
        unsubscribeError();
        unsubscribeLobbyCreated();
        unsubscribeConnect();
        unsubscribeDisconnect();
      };
    } else {
      console.log('❌ No effective public key available for socket connection');
      setError('No public key available for connection');
    }
  }, [effectivePublicKey, onJoinLobby]);

  const handleCreateLobby = (e) => {
    e.preventDefault();

    if (!createForm.name.trim()) {
      setError('Lobby name is required');
      return;
    }

    const lobbyData = {
      ...createForm,
      walletAddress: effectivePublicKey
    };

    console.log('🏠 Creating lobby with data:', lobbyData);
    socketService.createLobby(lobbyData);
  };

  const handleJoinLobby = (lobby) => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    if (lobby.status !== 'waiting') {
      setError('Lobby is not accepting players');
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      setError('Lobby is full');
      return;
    }

    console.log('👥 Joining lobby:', lobby.id);
    socketService.joinLobby(lobby.id, effectivePublicKey);

    if (onJoinLobby) {
      onJoinLobby(lobby.id, lobby);
    }
  };



  const formatTimeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="lobby-browser">
      {/* Header */}
      <div className="lobby-header">
        <button className="back-button" onClick={onBackToModeSelect}>
          ← BACK TO MODES
        </button>
        <h2>PVP LOBBIES</h2>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ⚠️ Socket connection error
        </div>
      )}

      {/* Actions */}
      <div className="lobby-actions">
        <button
          className="create-lobby-button"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'CANCEL' : '+ CREATE LOBBY'}
        </button>
        <button
          className="refresh-button"
          onClick={() => socketService.requestLobbies()}
          disabled={!isConnected}
        >
          🔄 REFRESH
        </button>
        {/* Debug button for testing connection */}
        <button
          onClick={() => {
            console.log('🔧 Manual connection test...');
            console.log('🔍 Auth publicKey:', publicKey);
            console.log('🔍 Effective publicKey:', effectivePublicKey);
            console.log('🔍 localStorage ceelo_pub:', localStorage.getItem('ceelo_pub'));

            const currentStatus = socketService.getConnectionStatus();
            console.log('🔍 Current connection status:', currentStatus);

            if (effectivePublicKey) {
              console.log('🔌 Force reconnecting with:', effectivePublicKey);
              socketService.forceReconnect(effectivePublicKey);
            } else {
              console.error('❌ No effective public key available for connection');
              setError('No public key available for connection test');
            }
          }}
          style={{
            background: 'linear-gradient(145deg, #4a4a3a, #2a2a2a)',
            border: '1px solid var(--sa-gold)',
            color: 'var(--sa-sand)',
            padding: '8px 12px',
            fontSize: '0.8rem',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          🔧 TEST CONNECTION
        </button>
      </div>

      {/* Create Lobby Form */}
      {showCreateForm && (
        <div className="create-lobby-form">
          <h3>CREATE NEW LOBBY</h3>
          <form onSubmit={handleCreateLobby}>
            <div className="form-row">
              <label>Lobby Name:</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                placeholder="Enter lobby name..."
                maxLength={30}
                required
              />
            </div>

            <div className="form-row">
              <label>Difficulty:</label>
              <select
                value={createForm.difficulty}
                onChange={(e) => setCreateForm({...createForm, difficulty: e.target.value})}
              >
                <option value="easy">Easy (0.1 SOL per round)</option>
                <option value="medium">Medium (0.5 SOL per round)</option>
              </select>
            </div>

            <div className="form-row">
              <label>Max Players:</label>
              <select
                value={createForm.maxPlayers}
                onChange={(e) => setCreateForm({...createForm, maxPlayers: parseInt(e.target.value)})}
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </div>

            <div className="form-row">
              <label>Total Rounds:</label>
              <select
                value={createForm.totalRounds}
                onChange={(e) => setCreateForm({...createForm, totalRounds: parseInt(e.target.value)})}
              >
                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                  <option key={num} value={num}>{num} Round{num > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-summary">
              <p>
                <strong>Total Commitment:</strong> {calculateTotalCommitment(createForm.difficulty, createForm.totalRounds).toFixed(1)} SOL
              </p>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                CREATE LOBBY
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lobby List */}
      <div className="lobby-list">
        {lobbies.length === 0 ? (
          <div className="no-lobbies">
            <p>No lobbies available</p>
            <small>Create the first lobby to get started!</small>
          </div>
        ) : (
          lobbies.map(lobby => (
            <div key={lobby.id} className={`lobby-card ${lobby.status}`}>
              <div className="lobby-info">
                <div className="lobby-name">{lobby.name}</div>
                <div className="lobby-details">
                  <span className="difficulty">{formatDifficulty(lobby.difficulty)}</span>
                  <span className="rounds">{lobby.totalRounds} round{lobby.totalRounds > 1 ? 's' : ''}</span>
                  <span className="players">{lobby.players.length}/{lobby.maxPlayers} players</span>
                </div>
                <div className="lobby-meta">
                  <span className="status">{formatLobbyStatus(lobby.status)}</span>
                  <span className="created">{formatTimeAgo(lobby.createdAt)}</span>
                </div>
              </div>
              <div className="lobby-actions">
                {lobby.status === 'waiting' && lobby.players.length < lobby.maxPlayers ? (
                  <button
                    className="join-button"
                    onClick={() => handleJoinLobby(lobby)}
                    disabled={!isConnected}
                  >
                    JOIN
                  </button>
                ) : (
                  <button className="join-button disabled" disabled>
                    {lobby.status === 'payment' ? 'PAYMENT' :
                     lobby.status === 'ready' ? 'READY' :
                     lobby.status === 'in-game' ? 'IN GAME' :
                     lobby.status.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
