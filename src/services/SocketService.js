import { io } from 'socket.io-client';
import { API_CONFIG } from '../config/api.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.listeners = new Map();
    this.retryTimeout = null;
    this.currentWalletAddress = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 3000; // Start with 3 seconds
    this.maxRetryDelay = 30000; // Max 30 seconds
    this.connectionAttempts = 0;
    this.lastConnectionAttempt = null;
  }

  // Detect if running on mobile device
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Transform backend lobby data to frontend format
  transformLobbyData(backendLobby) {
    return {
      ...backendLobby,
      // Ensure players array exists
      players: backendLobby.players || [],
      // Map backend fields to frontend expectations
      betAmount: backendLobby.difficulty === 'easy' ? 0.1 : 0.5,
      rounds: backendLobby.totalRounds || backendLobby.rounds || 1,
      // Preserve all original fields
      difficulty: backendLobby.difficulty,
      totalRounds: backendLobby.totalRounds,
      status: backendLobby.status,
      treasuryAddress: backendLobby.treasuryAddress
    };
  }

  connect(walletAddress) {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log('🔌 Connection already in progress, skipping...');
      return this.socket;
    }

    // Rate limiting: prevent too frequent connection attempts (longer for mobile)
    const now = Date.now();
    const rateLimit = this.isMobile() ? 2000 : 1000; // 2s for mobile, 1s for desktop
    if (this.lastConnectionAttempt && (now - this.lastConnectionAttempt) < rateLimit) {
      console.log('🔌 Rate limiting: too frequent connection attempts, skipping...');
      return this.socket;
    }

    // If already connected to the same wallet, don't reconnect
    if (this.socket && this.isConnected && this.currentWalletAddress === walletAddress) {
      console.log('🔌 Already connected to same wallet, reusing connection...');
      this.resetRetryState(); // Reset retry state on successful reuse
      return this.socket;
    }

    // Clean up any existing connection
    if (this.socket) {
      console.log('🔌 Disconnecting existing socket before reconnecting...');
      this.disconnect();
    }

    this.isConnecting = true;
    this.currentWalletAddress = walletAddress;
    this.lastConnectionAttempt = now;
    this.connectionAttempts++;

    // Silently attempt connection

    // Force production URL for immediate fix with fallback
    let socketUrl;
    if (process.env.NODE_ENV === 'production') {
      // Try primary backend URL first, with fallback options
      const backendUrls = [
        'https://ceelosol-backend.onrender.com',
        'wss://ceelosol-backend.onrender.com',
        'https://ceelosol-backend.onrender.com:443'
      ];

      // Use the first URL for now, but we'll implement retry logic
      socketUrl = backendUrls[0];
      console.log('🔌 Production mode: Using backend URL:', socketUrl);
      console.log('🔌 Available fallback URLs:', backendUrls.slice(1));
    } else {
      socketUrl = API_CONFIG.SOCKET_URL;
      console.log('🔌 Development mode: Using local URL:', socketUrl);
    }

    const isMobileDevice = this.isMobile();
    console.log('🔌 Connecting to socket URL:', socketUrl, 'Mobile:', isMobileDevice);

    // Production-optimized socket configuration
    const isProduction = process.env.NODE_ENV === 'production';
    const socketConfig = {
      transports: isProduction ? ['polling', 'websocket'] : (isMobileDevice ? ['polling'] : ['polling', 'websocket']),
      timeout: isProduction ? 45000 : (isMobileDevice ? 30000 : 20000), // Longer timeout for production
      forceNew: true,
      autoConnect: true,
      upgrade: isProduction ? true : (isMobileDevice ? false : true),
      rememberUpgrade: false,
      reconnection: true,
      reconnectionDelay: isProduction ? 3000 : (isMobileDevice ? 2000 : 1000),
      reconnectionAttempts: isProduction ? 20 : (isMobileDevice ? 15 : 10),
      maxHttpBufferSize: 1e6,
      // Production-specific options
      ...(isProduction && {
        pingTimeout: 120000, // 2 minutes for production
        pingInterval: 30000,  // 30 seconds for production
        forceBase64: false,
        enablesXDR: false,
        withCredentials: false
      }),
      // Mobile-specific options
      ...(isMobileDevice && !isProduction && {
        pingTimeout: 60000,
        pingInterval: 25000,
      })
    };

    this.socket = io(socketUrl, socketConfig);

    // Add connection timeout detection
    const connectionTimeout = setTimeout(() => {
      if (this.isConnecting && !this.isConnected) {
        console.error('🕐 Socket connection timeout after 30 seconds to:', socketUrl);
        console.log('🔧 Attempting to force reconnect...');
        if (this.socket) {
          this.socket.disconnect();
          this.socket.connect();
        }
      }
    }, 30000);

    this.socket.on('connect', () => {
      // Clear connection timeout
      clearTimeout(connectionTimeout);

      // Silently handle successful connection
      this.isConnected = true;
      this.isConnecting = false;

      // Clear any pending retry and reset retry state
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      this.resetRetryState();

      // Authenticate with wallet address
      if (walletAddress) {
        // Silently authenticate

        // Get nickname from profile service
        const profileService = require('./profileService').default;
        const profile = profileService.getProfile(walletAddress);
        const nickname = profile?.nickname?.trim() || null;

        this.socket.emit('authenticate', {
          walletAddress,
          nickname: nickname
        });

        // Request lobbies after authentication
        setTimeout(() => {
          if (this.isConnected && this.socket) {
            // Silently request lobbies
            this.socket.emit('lobbies:request');
          }
        }, 500);
      }

      // Notify listeners of connection
      this.notifyListeners('connect', { walletAddress });
    });

    this.socket.on('disconnect', (reason) => {
      // Silently handle disconnection
      this.isConnected = false;
      this.isConnecting = false;

      // Notify listeners of disconnection
      this.notifyListeners('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.log('🔌 Connection error details:', {
        error: error.message || error,
        type: error.type,
        description: error.description,
        context: error.context,
        transport: error.transport,
        url: socketUrl,
        timestamp: new Date().toISOString()
      });

      // Log specific error for debugging
      console.error('❌ Socket connection failed to:', socketUrl, error);

      this.isConnected = false;
      this.isConnecting = false;

      // Clear any existing retry timeout
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }

      // Mobile-friendly retry logic with longer delays
      if (walletAddress && this.retryCount < this.maxRetries) {
        this.retryCount++;
        // Longer delays for mobile networks
        const delay = Math.min(this.retryDelay * Math.pow(1.5, this.retryCount - 1), this.maxRetryDelay);

        console.log(`🔄 Retrying connection in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);

        this.retryTimeout = setTimeout(() => {
          if (!this.isConnected && !this.isConnecting) {
            this.connect(walletAddress);
          }
        }, delay);
      } else if (this.retryCount >= this.maxRetries) {
        console.log('❌ Max retries reached for socket connection');
        this.notifyListeners('error', {
          message: 'PVP lobbies temporarily unavailable - please check your internet connection',
          error,
          maxRetriesReached: true
        });
      }

      // Notify listeners of error with user-friendly message
      this.notifyListeners('error', {
        message: 'Connecting to PVP lobbies...',
        error,
        retryCount: this.retryCount,
        maxRetries: this.maxRetries
      });
    });

    // Set up event forwarding
    this.setupEventForwarding();

    return this.socket;
  }

  disconnect() {
    console.log('🔌 Disconnecting from Socket.io server...');

    // Clear any pending retry
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Reset state
    this.isConnected = false;
    this.isConnecting = false;
    this.currentWalletAddress = null;
    this.resetRetryState();

    // Disconnect socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Reset retry state on successful connection or manual disconnect
  resetRetryState() {
    this.retryCount = 0;
    this.connectionAttempts = 0;
    console.log('🔄 Retry state reset');
  }

  // Check if connection is healthy
  isConnectionHealthy() {
    return this.socket &&
           this.socket.connected &&
           this.isConnected &&
           !this.isConnecting;
  }

  // Get detailed connection info for debugging
  getDetailedConnectionInfo() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      currentWallet: this.currentWalletAddress,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      connectionAttempts: this.connectionAttempts,
      lastConnectionAttempt: this.lastConnectionAttempt,
      hasRetryTimeout: !!this.retryTimeout,
      isHealthy: this.isConnectionHealthy()
    };
  }

  setupEventForwarding() {
    // Forward all socket events to registered listeners
    const events = [
      'lobbies:list',
      'lobby:created',
      'lobby:updated',
      'lobby:joined',
      'lobby:left',
      'game:started',
      'round:started',
      'player:rolled',
      'round:next-player',
      'round:reroll',
      'round:ended',
      'round:tied',
      'game:tied',
      'game:ended',
      'taunt:received',
      'error'
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        // Transform lobby data for specific events
        if (event === 'lobby:created' && data.lobby) {
          data.lobby = this.transformLobbyData(data.lobby);
        } else if (event === 'lobby:updated' && data) {
          data = this.transformLobbyData(data);
        } else if (event === 'lobbies:list' && Array.isArray(data)) {
          data = data.map(lobby => this.transformLobbyData(lobby));
        }
        
        // Forward transformed event
        this.notifyListeners(event, data);
      });
    });
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Lobby methods
  createLobby(lobbyData) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    // Add nickname to lobby data
    const profileService = require('./profileService').default;
    const profile = profileService.getProfile(lobbyData.walletAddress);
    const nickname = profile?.nickname?.trim() || null;

    const lobbyDataWithNickname = {
      ...lobbyData,
      nickname: nickname
    };

    console.log('🏠 Creating lobby:', lobbyDataWithNickname);
    this.socket.emit('lobby:create', lobbyDataWithNickname);
    return true;
  }

  joinLobby(lobbyId, walletAddress) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    // Add nickname to join data
    const profileService = require('./profileService').default;
    const profile = profileService.getProfile(walletAddress);
    const nickname = profile?.nickname?.trim() || null;

    console.log(`👥 Joining lobby ${lobbyId}`);
    this.socket.emit('lobby:join', {
      lobbyId,
      walletAddress,
      nickname: nickname
    });
    return true;
  }

  leaveLobby(lobbyId, walletAddress) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    console.log(`👋 Leaving lobby ${lobbyId}`);
    this.socket.emit('lobby:leave', { lobbyId, walletAddress });
    return true;
  }

  setReady(lobbyId, walletAddress, isReady) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    console.log(`✅ Setting ready status: ${isReady} in lobby ${lobbyId}`);
    this.socket.emit('lobby:ready', { lobbyId, walletAddress, isReady });
    return true;
  }

  confirmPayment(lobbyId, walletAddress, signature, amount) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    console.log(`💰 Confirming payment: ${amount} SOL in lobby ${lobbyId}`);
    this.socket.emit('lobby:payment', { lobbyId, walletAddress, signature, amount });
    return true;
  }

  // Game methods
  rollDice(lobbyId, walletAddress, dice) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    console.log(`🎲 Rolling dice in lobby ${lobbyId}:`, dice);
    this.socket.emit('game:roll', { lobbyId, walletAddress, dice });
    return true;
  }

  sendTaunt(lobbyId, walletAddress, soundId, soundName) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    console.log(`🎵 Sending taunt in lobby ${lobbyId}: ${soundName} (${soundId})`);
    this.socket.emit('taunt:send', { lobbyId, walletAddress, soundId, soundName });
    return true;
  }

  // Utility methods
  getConnectionStatus() {
    const socketExists = !!this.socket;
    const socketConnected = this.socket?.connected === true;
    const finalStatus = this.isConnected && socketConnected && !this.isConnecting;

    const status = {
      isConnected: finalStatus,
      isConnecting: this.isConnecting,
      socketId: this.socket?.id || null,
      socketConnected: socketConnected,
      internalConnected: this.isConnected,
      socketExists: socketExists,
      currentWallet: this.currentWalletAddress
    };

    // Log every status check for debugging with more detail
    console.log('🔍 Connection Status Check:');
    console.log('  - Socket exists:', socketExists);
    console.log('  - Socket connected:', socketConnected);
    console.log('  - Internal connected:', this.isConnected);
    console.log('  - Is connecting:', this.isConnecting);
    console.log('  - Current wallet:', this.currentWalletAddress);
    console.log('  - Final status:', finalStatus);
    console.log('  - Socket ID:', this.socket?.id || 'none');

    return status;
  }

  // Force reconnection (useful for testing)
  forceReconnect(walletAddress) {
    console.log('🔄 Forcing reconnection...');
    console.log('🔍 Connection info before force reconnect:', this.getDetailedConnectionInfo());

    // Reset retry state for fresh start
    this.resetRetryState();

    // Disconnect and reconnect
    this.disconnect();
    return this.connect(walletAddress);
  }

  // Manual retry with exponential backoff reset
  retryConnection() {
    if (!this.currentWalletAddress) {
      console.error('❌ No wallet address available for retry');
      return false;
    }

    console.log('🔄 Manual retry requested...');

    // Reset retry count for manual retry
    this.retryCount = Math.max(0, this.retryCount - 1);

    return this.connect(this.currentWalletAddress);
  }

  // Request current lobbies
  requestLobbies() {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return false;
    }

    this.socket.emit('lobbies:request');
    return true;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;

// React hook for using socket service
export const useSocket = () => {
  return socketService;
};

// Helper function to format lobby difficulty
export const formatDifficulty = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return '0.1 SOL per round';
    case 'medium':
      return '0.5 SOL per round';
    default:
      return 'Unknown';
  }
};

// Helper function to format lobby status
export const formatLobbyStatus = (status) => {
  switch (status) {
    case 'waiting':
      return 'Waiting for players';
    case 'payment':
      return 'Payment required';
    case 'ready':
      return 'Ready to start';
    case 'in-game':
      return 'Game in progress';
    case 'finished':
      return 'Game finished';
    default:
      return 'Unknown';
  }
};

// Helper function to calculate total commitment
export const calculateTotalCommitment = (difficulty, totalRounds) => {
  const betPerRound = difficulty === 'easy' ? 0.1 : 0.5;
  return betPerRound * totalRounds;
};

// Helper function to calculate max potential winnings
export const calculateMaxWinnings = (difficulty, totalRounds, maxPlayers) => {
  const betPerRound = difficulty === 'easy' ? 0.1 : 0.5;
  const potPerRound = betPerRound * maxPlayers;
  return potPerRound * totalRounds; // If you win every round
};
