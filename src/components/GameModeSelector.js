import React, { useState } from 'react';
import { useAuth } from '../util/auth';
import profileService from '../services/profileService';
import ProfileEdit from './ProfileEdit';
import PlayerName from './PlayerName';
import GhettoRadio from './GhettoRadio';
import ErrorBoundary from './ErrorBoundary';
import ActivityFeed from './ActivityFeed';
import ChatLobby from './ChatLobby';
import './GameModeSelector.css';

/**
 * GameModeSelector - Choose between Single Player and PVP modes
 * This preserves the existing single-player functionality while adding PVP
 */
export function GameModeSelector({ onModeSelect, currentMode }) {
  const [selectedMode, setSelectedMode] = useState(currentMode || 'pvp');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const { logout, publicKey, isAuthenticated, initializeFromSession } = useAuth();

  // Initialize profile service with current user
  React.useEffect(() => {
    if (publicKey) {
      profileService.setCurrentProfile(publicKey);
    }
  }, [publicKey]);

  // Debug authentication state
  console.log('🔍 GameModeSelector Auth State:', {
    isAuthenticated,
    publicKey,
    hasPublicKey: !!publicKey,
    localStorage_pub: localStorage.getItem('ceelo_pub'),
    sessionStorage_auth: sessionStorage.getItem('ceelo_authorized_wallet')
  });

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    onModeSelect(mode);
  };

  return (
    <div className="game-mode-selector">
      <div className="mode-title">
        <div className="title-header">
          <div className="title-content">
            <h2>WELCOME TO THE STREETS</h2>
            <p>Where dice roll and money flows - you ready to get down?</p>
          </div>
          <div className="user-controls">
            <div className="wallet-info">
              <span className="wallet-label">Player:</span>
              <span className="wallet-address">
                {publicKey ? (
                  <PlayerName
                    walletAddress={publicKey}
                    currentUserAddress={publicKey}
                    showYou={true}
                    forceShowName={true}
                    maxLength={12}
                  />
                ) : 'Not connected'}
              </span>
            </div>
            <div className="control-buttons">
              <button
                className="profile-button"
                onClick={() => setShowProfileEdit(true)}
                title="Edit Profile & View Stats"
              >
                👤 PROFILE
              </button>
              <button
                className="logout-button"
                onClick={logout}
                title="Logout and return to access control"
              >
                🚪 LOGOUT
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mode-options">
        {/* Real-Time Activity Feed */}
        <div className="activity-feed-card">
          <div className="activity-header">
            <div className="activity-icon">🏆</div>
            <h3>RECENT WINNERS</h3>
            <p>Live game activity</p>
          </div>
          <div className="activity-content">
            <ActivityFeed />
          </div>
        </div>

        {/* PVP Mode - Now the main focus */}
        <div
          className={`mode-card pvp-main ${selectedMode === 'pvp' ? 'selected' : ''}`}
          onClick={() => handleModeSelect('pvp')}
        >
          <div className="mode-icon">🎲</div>
          <div className="mode-info">
            <h3>STREET DICE BATTLES</h3>
            <p>Step up and show these fools how it's done</p>
            <ul className="mode-features">
              <li>🔥 Back-alley tournaments</li>
              <li>👥 2-4 hustlers per game</li>
              <li>💸 Winner takes all the cash</li>
              <li>🏆 Prove you're the real deal</li>
            </ul>
          </div>
          <div className="mode-status">
            {selectedMode === 'pvp' && <span className="selected-badge">SELECTED</span>}
            <span className="live-badge">LIVE!</span>
          </div>
        </div>
      </div>

      <div className="chat-lobby-section">
        <div className="chat-header">
          <div className="chat-icon">💬</div>
          <h3>STREET TALK</h3>
          <p>Chat with the crew before you roll</p>
        </div>
        <div className="chat-content">
          <ChatLobby />
        </div>
      </div>

      <div className="mode-actions">
        <button
          className="continue-button"
          onClick={() => onModeSelect('pvp')}
          disabled={selectedMode !== 'pvp'}
        >
          🎯 FIND A GAME
        </button>
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ErrorBoundary>
          <ProfileEdit
            walletAddress={publicKey}
            onClose={() => setShowProfileEdit(false)}
            onSave={(updatedProfile) => {
              console.log('Profile updated:', updatedProfile);
              setShowProfileEdit(false);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Ghetto Radio - Re-enabled with improved isolation */}
      <ErrorBoundary>
        <GhettoRadio key="ghetto-radio-main" />
      </ErrorBoundary>
    </div>
  );
}
