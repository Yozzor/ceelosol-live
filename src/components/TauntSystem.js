import React, { useState, useEffect } from 'react';
import './TauntSystem.css';
import tauntService from '../services/tauntService';

const TauntSystem = ({
  isVisible,
  onSendTaunt,
  cooldownRemaining,
  isDisabled = false
}) => {
  const [showSoundSelector, setShowSoundSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Taunts');
  const [soundCategories, setSoundCategories] = useState({});

  useEffect(() => {
    // Load sound categories from taunt service
    setSoundCategories(tauntService.getSoundCategories());
  }, []);

  const handleTauntClick = () => {
    if (cooldownRemaining > 0 || isDisabled) return;
    setShowSoundSelector(true);
  };

  const handleSoundSelect = (soundId, soundName) => {
    setShowSoundSelector(false);
    onSendTaunt(soundId, soundName);
  };

  const handleCloseSelector = () => {
    setShowSoundSelector(false);
  };

  if (!isVisible) return null;

  return (
    <div className="taunt-system">
      {/* Taunt Button */}
      <button
        className={`taunt-button ${cooldownRemaining > 0 ? 'on-cooldown' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={handleTauntClick}
        disabled={cooldownRemaining > 0 || isDisabled}
        title={cooldownRemaining > 0 ? `Cooldown: ${cooldownRemaining}s` : 'Send a taunt!'}
      >
        <span className="taunt-icon">🎵</span>
        <span className="taunt-text">
          {cooldownRemaining > 0 ? `TAUNT (${cooldownRemaining}s)` : 'TAUNT'}
        </span>
        {cooldownRemaining > 0 && (
          <div className="cooldown-progress">
            <div
              className="cooldown-bar"
              style={{ width: `${((30 - cooldownRemaining) / 30) * 100}%` }}
            ></div>
          </div>
        )}
      </button>

      {/* Sound Selection Modal */}
      {showSoundSelector && (
        <div className="taunt-modal-overlay" onClick={handleCloseSelector}>
          <div className="taunt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="taunt-modal-header">
              <h3>🎵 SELECT YOUR TAUNT</h3>
              <button className="close-button" onClick={handleCloseSelector}>✕</button>
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
              {Object.keys(soundCategories).map(category => (
                <button
                  key={category}
                  className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Sound Grid */}
            <div className="sounds-grid">
              {soundCategories[selectedCategory]?.map(sound => (
                <button
                  key={sound.id}
                  className="sound-button"
                  onClick={() => handleSoundSelect(sound.id, sound.name)}
                  title={`Play: ${sound.name}`}
                >
                  <span className="sound-name">{sound.name}</span>
                </button>
              ))}
            </div>

            <div className="taunt-modal-footer">
              <p>⚠️ 30-second cooldown after sending a taunt</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TauntSystem;
