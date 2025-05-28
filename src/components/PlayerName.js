import React from 'react';
import profileService from '../services/profileService';
import './PlayerName.css';

/**
 * PlayerName Component
 * Displays player nickname or shortened wallet address
 * Can be used throughout the app to show consistent player names
 */
const PlayerName = ({
  walletAddress,
  currentUserAddress = null,
  showYou = true,
  forceShowName = false, // New prop to force showing name instead of "YOU"
  maxLength = null,
  className = '',
  style = {},
  nickname = null // Add nickname prop for lobby data
}) => {
  if (!walletAddress) {
    return <span className={className} style={style}>Unknown Player</span>;
  }

  // Check if this is the current user
  const isCurrentUser = currentUserAddress && walletAddress === currentUserAddress;

  // Use provided nickname first, then fall back to profile service
  let displayName;
  if (nickname && nickname.trim()) {
    // Use the provided nickname (from message data)
    displayName = nickname.trim();
  } else {
    // Fall back to profile service (for local profiles and backwards compatibility)
    displayName = profileService.getDisplayName(walletAddress);
  }

  // Truncate if maxLength is specified
  if (maxLength && displayName.length > maxLength) {
    displayName = displayName.substring(0, maxLength - 3) + '...';
  }

  // Show "YOU" only if showYou is true AND forceShowName is false
  if (isCurrentUser && showYou && !forceShowName) {
    return <span className={`player-name current-user ${className}`} style={style}>YOU</span>;
  }

  return (
    <span
      className={`player-name ${isCurrentUser ? 'current-user' : ''} ${className}`}
      style={style}
      title={walletAddress} // Show full wallet on hover
    >
      {displayName}
    </span>
  );
};

/**
 * PlayerNameWithProfile Component
 * Shows player name with a clickable profile indicator
 */
export const PlayerNameWithProfile = ({
  walletAddress,
  currentUserAddress = null,
  onProfileClick = null,
  showYou = true,
  maxLength = null,
  className = '',
  style = {}
}) => {
  const profile = profileService.getProfile(walletAddress);
  const hasCustomName = profile && profile.nickname && profile.nickname.trim();

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick(walletAddress);
    }
  };

  return (
    <span className={`player-name-with-profile ${className}`} style={style}>
      <PlayerName
        walletAddress={walletAddress}
        currentUserAddress={currentUserAddress}
        showYou={showYou}
        maxLength={maxLength}
      />
      {hasCustomName && (
        <span
          className="profile-indicator"
          onClick={handleProfileClick}
          title="Custom profile"
        >
          👤
        </span>
      )}
    </span>
  );
};

/**
 * PlayerList Component
 * Shows a list of players with their names and stats
 */
export const PlayerList = ({
  players,
  currentUserAddress = null,
  showStats = false,
  onProfileClick = null,
  className = ''
}) => {
  return (
    <div className={`player-list ${className}`}>
      {players.map((player, index) => {
        const walletAddress = typeof player === 'string' ? player : player.walletAddress;
        const stats = typeof player === 'object' ? player.stats : null;

        return (
          <div key={walletAddress} className="player-list-item">
            <div className="player-info">
              <span className="player-rank">#{index + 1}</span>
              <PlayerNameWithProfile
                walletAddress={walletAddress}
                currentUserAddress={currentUserAddress}
                onProfileClick={onProfileClick}
                maxLength={15}
              />
            </div>
            {showStats && stats && (
              <div className="player-stats">
                <span className="stat">{stats.wins || 0} wins</span>
                <span className="stat">{(stats.totalWinnings || 0).toFixed(2)} SOL</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * PlayerCard Component
 * Shows a player card with avatar, name, and basic stats
 */
export const PlayerCard = ({
  walletAddress,
  currentUserAddress = null,
  showStats = true,
  onClick = null,
  className = ''
}) => {
  const profile = profileService.getProfile(walletAddress);
  const summary = profileService.getProfileSummary(walletAddress);
  const isCurrentUser = currentUserAddress && walletAddress === currentUserAddress;

  const handleClick = () => {
    if (onClick) {
      onClick(walletAddress);
    }
  };

  return (
    <div
      className={`player-card ${isCurrentUser ? 'current-user' : ''} ${onClick ? 'clickable' : ''} ${className}`}
      onClick={handleClick}
    >
      <div className="player-avatar">
        {isCurrentUser ? '👤' : '🎮'}
      </div>
      <div className="player-details">
        <div className="player-name-section">
          <PlayerName
            walletAddress={walletAddress}
            currentUserAddress={currentUserAddress}
            maxLength={12}
          />
        </div>
        {showStats && summary && (
          <div className="player-quick-stats">
            <span className="quick-stat">{summary.stats.gamesWon}W</span>
            <span className="quick-stat">{summary.stats.winRate}%</span>
            <span className="quick-stat">{summary.stats.totalWinnings.toFixed(1)} SOL</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerName;
