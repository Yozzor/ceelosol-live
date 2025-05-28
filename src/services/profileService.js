/**
 * Player Profile Service
 * Manages player profiles, nicknames, stats, and preferences
 */

const PROFILE_STORAGE_KEY = 'ceelosol_player_profiles';
const CURRENT_PROFILE_KEY = 'ceelosol_current_profile';

// Default profile structure
const createDefaultProfile = (walletAddress) => ({
  walletAddress,
  nickname: '', // Empty by default, will show wallet if not set
  avatar: '', // Future: avatar selection
  stats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalWinnings: 0,
    totalLosses: 0,
    bestStreak: 0,
    currentStreak: 0,
    jackpotsHit: 0,
    roundsWon: 0,
    roundsPlayed: 0
  },
  preferences: {
    soundEnabled: true,
    animationsEnabled: true,
    theme: 'default' // Future: theme selection
  },
  achievements: [], // Future: achievement system
  createdAt: new Date().toISOString(),
  lastActive: new Date().toISOString()
});

class ProfileService {
  constructor() {
    this.profiles = this.loadProfiles();
    this.currentProfile = null;
  }

  // Load all profiles from localStorage
  loadProfiles() {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading profiles:', error);
      return {};
    }
  }

  // Save all profiles to localStorage
  saveProfiles() {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.profiles));
    } catch (error) {
      console.error('Error saving profiles:', error);
    }
  }

  // Get or create profile for wallet address
  getProfile(walletAddress) {
    if (!walletAddress) return null;

    if (!this.profiles[walletAddress]) {
      this.profiles[walletAddress] = createDefaultProfile(walletAddress);
      this.saveProfiles();
    }

    // Update last active
    this.profiles[walletAddress].lastActive = new Date().toISOString();
    return this.profiles[walletAddress];
  }

  // Set current active profile
  setCurrentProfile(walletAddress) {
    this.currentProfile = this.getProfile(walletAddress);
    localStorage.setItem(CURRENT_PROFILE_KEY, walletAddress);
    return this.currentProfile;
  }

  // Get current active profile
  getCurrentProfile() {
    if (!this.currentProfile) {
      const stored = localStorage.getItem(CURRENT_PROFILE_KEY);
      if (stored) {
        this.currentProfile = this.getProfile(stored);
      }
    }
    return this.currentProfile;
  }

  // Update profile data
  updateProfile(walletAddress, updates) {
    const profile = this.getProfile(walletAddress);
    if (!profile) return null;

    // Merge updates with existing profile
    Object.assign(profile, updates);
    profile.lastActive = new Date().toISOString();

    this.saveProfiles();
    return profile;
  }

  // Update nickname
  updateNickname(walletAddress, nickname) {
    return this.updateProfile(walletAddress, { nickname: nickname.trim() });
  }

  // Get display name (nickname or shortened wallet)
  getDisplayName(walletAddress) {
    const profile = this.getProfile(walletAddress);
    if (profile && profile.nickname && profile.nickname.trim()) {
      return profile.nickname.trim();
    }
    return `${walletAddress.substring(0, 8)}...`;
  }

  // Update game stats
  updateGameStats(walletAddress, gameResult) {
    const profile = this.getProfile(walletAddress);
    if (!profile) return null;

    const stats = profile.stats;
    stats.gamesPlayed += 1;

    if (gameResult.won) {
      stats.gamesWon += 1;
      stats.totalWinnings += gameResult.winnings || 0;
      stats.currentStreak += 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    } else {
      stats.totalLosses += 1;
      stats.currentStreak = 0;
    }

    if (gameResult.roundsWon) {
      stats.roundsWon += gameResult.roundsWon;
    }
    if (gameResult.roundsPlayed) {
      stats.roundsPlayed += gameResult.roundsPlayed;
    }
    if (gameResult.jackpotsHit) {
      stats.jackpotsHit += gameResult.jackpotsHit;
    }

    this.saveProfiles();
    return profile;
  }

  // Update round stats (called after each round)
  updateRoundStats(walletAddress, roundResult) {
    const profile = this.getProfile(walletAddress);
    if (!profile) return null;

    const stats = profile.stats;
    stats.roundsPlayed += 1;

    if (roundResult.won) {
      stats.roundsWon += 1;
      if (roundResult.isJackpot) {
        stats.jackpotsHit += 1;
      }
    }

    this.saveProfiles();
    return profile;
  }

  // Get leaderboard of all players
  getGlobalLeaderboard(sortBy = 'totalWinnings') {
    return Object.values(this.profiles)
      .filter(profile => profile.stats.gamesPlayed > 0)
      .sort((a, b) => {
        switch (sortBy) {
          case 'gamesWon':
            return b.stats.gamesWon - a.stats.gamesWon;
          case 'winRate':
            const aRate = a.stats.gamesPlayed > 0 ? a.stats.gamesWon / a.stats.gamesPlayed : 0;
            const bRate = b.stats.gamesPlayed > 0 ? b.stats.gamesWon / b.stats.gamesPlayed : 0;
            return bRate - aRate;
          case 'bestStreak':
            return b.stats.bestStreak - a.stats.bestStreak;
          case 'jackpotsHit':
            return b.stats.jackpotsHit - a.stats.jackpotsHit;
          default: // totalWinnings
            return b.stats.totalWinnings - a.stats.totalWinnings;
        }
      });
  }

  // Export profile data (for backup)
  exportProfile(walletAddress) {
    const profile = this.getProfile(walletAddress);
    return profile ? JSON.stringify(profile, null, 2) : null;
  }

  // Import profile data (from backup)
  importProfile(profileData) {
    try {
      const profile = JSON.parse(profileData);
      if (profile.walletAddress) {
        this.profiles[profile.walletAddress] = profile;
        this.saveProfiles();
        return true;
      }
    } catch (error) {
      console.error('Error importing profile:', error);
    }
    return false;
  }

  // Delete profile
  deleteProfile(walletAddress) {
    if (this.profiles[walletAddress]) {
      delete this.profiles[walletAddress];
      this.saveProfiles();
      
      // Clear current profile if it was deleted
      if (this.currentProfile?.walletAddress === walletAddress) {
        this.currentProfile = null;
        localStorage.removeItem(CURRENT_PROFILE_KEY);
      }
      return true;
    }
    return false;
  }

  // Get profile statistics summary
  getProfileSummary(walletAddress) {
    const profile = this.getProfile(walletAddress);
    if (!profile) return null;

    const stats = profile.stats;
    const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed * 100).toFixed(1) : '0.0';
    const roundWinRate = stats.roundsPlayed > 0 ? (stats.roundsWon / stats.roundsPlayed * 100).toFixed(1) : '0.0';

    return {
      displayName: this.getDisplayName(walletAddress),
      nickname: profile.nickname,
      stats: {
        ...stats,
        winRate: parseFloat(winRate),
        roundWinRate: parseFloat(roundWinRate)
      },
      memberSince: new Date(profile.createdAt).toLocaleDateString(),
      lastActive: new Date(profile.lastActive).toLocaleDateString()
    };
  }
}

// Create singleton instance
const profileService = new ProfileService();

export default profileService;
