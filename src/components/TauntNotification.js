import React, { useEffect, useState } from 'react';
import './TauntNotification.css';
import PlayerName from './PlayerName';

const TauntNotification = ({ 
  taunt, 
  currentUserAddress, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (taunt) {
      setIsVisible(true);
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [taunt, onClose]);

  if (!taunt) return null;

  const isOwnTaunt = taunt.fromPlayer === currentUserAddress;

  return (
    <div className={`taunt-notification ${isVisible ? 'visible' : ''} ${isOwnTaunt ? 'own-taunt' : ''}`}>
      <div className="taunt-notification-content">
        <div className="taunt-header">
          <span className="taunt-icon">🎵</span>
          <span className="taunt-title">
            {isOwnTaunt ? 'YOU TAUNTED!' : 'INCOMING TAUNT!'}
          </span>
        </div>
        
        <div className="taunt-details">
          <div className="taunt-player">
            {isOwnTaunt ? (
              <span className="player-you">YOU</span>
            ) : (
              <PlayerName
                walletAddress={taunt.fromPlayer}
                currentUserAddress={currentUserAddress}
                showYou={false}
                maxLength={12}
                nickname={taunt.fromNickname}
              />
            )}
          </div>
          
          <div className="taunt-sound">
            <span className="sound-label">played:</span>
            <span className="sound-name">"{taunt.soundName}"</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TauntNotification;
