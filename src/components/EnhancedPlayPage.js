import React, { useState } from 'react';
import { PlayPage } from '../pages/PlayPage';
import { GameModeSelector } from './GameModeSelector';
import { LobbyBrowser } from './LobbyBrowser';
import { LobbyRoom } from './LobbyRoom';

/**
 * EnhancedPlayPage - Wrapper that adds PVP functionality while preserving single-player
 * This component manages the different game modes and navigation between them
 */
export function EnhancedPlayPage() {
  const [currentView, setCurrentView] = useState('mode-select'); // 'mode-select', 'single-player', 'lobby-browser', 'lobby-room'
  const [currentLobby, setCurrentLobby] = useState(null);

  const handleModeSelect = (mode) => {
    console.log('🎮 Mode selected:', mode);
    
    if (mode === 'single') {
      setCurrentView('single-player');
    } else if (mode === 'pvp') {
      setCurrentView('lobby-browser');
    }
  };

  const handleBackToModeSelect = () => {
    console.log('🔙 Returning to mode selection');
    setCurrentView('mode-select');
    setCurrentLobby(null);
  };

  const handleJoinLobby = (lobbyId, lobby) => {
    console.log('🏠 Joining lobby:', lobbyId, lobby);
    setCurrentLobby({ id: lobbyId, ...lobby });
    setCurrentView('lobby-room');
  };

  const handleLeaveLobby = () => {
    console.log('👋 Leaving lobby');
    setCurrentLobby(null);
    setCurrentView('lobby-browser');
  };

  // Render based on current view
  switch (currentView) {
    case 'single-player':
      return (
        <div>
          {/* Back to mode selection button */}
          <div style={{ 
            position: 'fixed', 
            top: '20px', 
            left: '20px', 
            zIndex: 1000,
            background: 'rgba(0,0,0,0.8)',
            padding: '10px',
            borderRadius: '8px',
            border: '2px solid var(--sa-green)'
          }}>
            <button 
              onClick={handleBackToModeSelect}
              style={{
                background: 'linear-gradient(145deg, var(--sa-red), #8b1419)',
                border: '2px solid var(--sa-gold)',
                color: 'var(--sa-sand)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '0.9rem'
              }}
            >
              ← GAME MODES
            </button>
          </div>
          
          {/* Original single-player game */}
          <PlayPage />
        </div>
      );

    case 'lobby-browser':
      return (
        <LobbyBrowser 
          onBackToModeSelect={handleBackToModeSelect}
          onJoinLobby={handleJoinLobby}
        />
      );

    case 'lobby-room':
      return (
        <LobbyRoom 
          lobby={currentLobby}
          onLeaveLobby={handleLeaveLobby}
        />
      );

    case 'mode-select':
    default:
      return (
        <GameModeSelector 
          onModeSelect={handleModeSelect}
          currentMode={null}
        />
      );
  }
}

// Export both the enhanced version and original for flexibility
export { PlayPage as OriginalPlayPage };
