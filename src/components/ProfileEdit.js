import React, { useState, useEffect } from 'react';
import profileService from '../services/profileService';
import './ProfileEdit.css';

const ProfileEdit = ({ walletAddress, onClose, onSave }) => {
  const [profile, setProfile] = useState(null);
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (walletAddress) {
      const userProfile = profileService.getProfile(walletAddress);
      setProfile(userProfile);
      setNickname(userProfile.nickname || '');
      setOriginalNickname(userProfile.nickname || '');
    }
  }, [walletAddress]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      // Validate nickname
      const trimmedNickname = nickname.trim();
      if (trimmedNickname.length > 20) {
        setError('Nickname must be 20 characters or less');
        setIsSaving(false);
        return;
      }

      if (trimmedNickname && trimmedNickname.length < 2) {
        setError('Nickname must be at least 2 characters');
        setIsSaving(false);
        return;
      }

      // Update profile
      const updatedProfile = profileService.updateNickname(walletAddress, trimmedNickname);
      setProfile(updatedProfile);
      setOriginalNickname(trimmedNickname);

      // Notify parent component
      if (onSave) {
        onSave(updatedProfile);
      }

      // Show success message briefly
      setTimeout(() => {
        setIsSaving(false);
      }, 500);

    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNickname(originalNickname);
    setError('');
    if (onClose) {
      onClose();
    }
  };

  const hasChanges = nickname.trim() !== originalNickname;

  if (!profile) {
    return (
      <div className="profile-edit-modal">
        <div className="profile-edit-content">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  const summary = profileService.getProfileSummary(walletAddress);

  return (
    <div className="profile-edit-modal">
      <div className="profile-edit-content">
        <div className="profile-edit-header">
          <h2>Player Profile</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>

        <div className="profile-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="profile-tab">
            <div className="profile-section">
              <h3>Personal Information</h3>
              
              <div className="form-group">
                <label htmlFor="wallet">Wallet Address:</label>
                <div className="wallet-display">
                  <code>{walletAddress}</code>
                  <small>This cannot be changed</small>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="nickname">Display Name:</label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter a nickname (optional)"
                  maxLength={20}
                  className={error ? 'error' : ''}
                />
                <small>
                  {nickname.trim() ? 
                    `${nickname.trim().length}/20 characters` : 
                    'Leave empty to show wallet address'
                  }
                </small>
              </div>

              <div className="form-group">
                <label>Preview:</label>
                <div className="name-preview">
                  {nickname.trim() || `${walletAddress.substring(0, 8)}...`}
                </div>
              </div>

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button 
                className="save-button" 
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? '💾 Saving...' : '💾 Save Changes'}
              </button>
              <button className="cancel-button" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-tab">
            <div className="stats-overview">
              <h3>Player Statistics</h3>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.gamesPlayed}</div>
                  <div className="stat-label">Games Played</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.gamesWon}</div>
                  <div className="stat-label">Games Won</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.winRate}%</div>
                  <div className="stat-label">Win Rate</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.totalWinnings.toFixed(2)} SOL</div>
                  <div className="stat-label">Total Winnings</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.roundsWon}</div>
                  <div className="stat-label">Rounds Won</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.roundWinRate}%</div>
                  <div className="stat-label">Round Win Rate</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.jackpotsHit}</div>
                  <div className="stat-label">Jackpots Hit</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{summary.stats.bestStreak}</div>
                  <div className="stat-label">Best Streak</div>
                </div>
              </div>

              <div className="profile-info">
                <div className="info-item">
                  <strong>Member Since:</strong> {summary.memberSince}
                </div>
                <div className="info-item">
                  <strong>Last Active:</strong> {summary.lastActive}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEdit;
