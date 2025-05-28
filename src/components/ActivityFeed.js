import React, { useState, useEffect } from 'react';
import './ActivityFeed.css';
import { useTreasuryMonitor } from '../services/TreasuryMonitor';
import PlayerName from './PlayerName';
import { supabase } from '../services/supabaseClient';

/**
 * ActivityFeed component - Shows real-time wins and activity
 */
export function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const treasuryData = useTreasuryMonitor();



  // Function to format SOL amount
  const formatSOL = (lamports) => {
    const sol = lamports / 1000000000; // Convert lamports to SOL
    return sol.toFixed(4);
  };

  // Function to add new activity
  const addActivity = (activity) => {
    const newActivity = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      ...activity
    };

    setActivities(prev => {
      const updated = [newActivity, ...prev];
      // Keep only last 20 activities
      return updated.slice(0, 20);
    });
  };

  // Load real wins from backend and expose addActivity function
  useEffect(() => {
    window.addGameActivity = addActivity;

    // Load recent wins from Supabase
    const loadRecentWins = async () => {
      try {
        console.log('📊 Loading recent wins from Supabase...');

        const { data: gameResults, error } = await supabase
          .from('game_results')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching game results:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          // Don't return here, let it continue with empty array
        }

        // Add each win to the activity feed
        gameResults.forEach(result => {
          const amountLamports = result.amount; // Already in lamports
          const amountSOL = amountLamports / 1000000000; // Convert to SOL for comparison

          addActivity({
            type: amountSOL > 0.01 ? 'big_win' : 'win',
            playerAddress: result.player_address,
            amount: amountLamports,
            dice: result.dice_values || [1, 2, 3],
            result: result.result_type || 'win',
            timestamp: new Date(result.created_at)
          });
        });

        console.log(`📊 Loaded ${gameResults.length} recent wins from Supabase`);
      } catch (error) {
        console.error('Failed to load recent wins:', error);
      }
    };

    // Load wins on component mount
    loadRecentWins();

    // Subscribe to real-time game results
    const subscription = supabase
      .channel('game_results_channel')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_results'
        },
        (payload) => {
          console.log('New game result:', payload);
          const result = payload.new;
          const amountLamports = result.amount; // Already in lamports
          const amountSOL = amountLamports / 1000000000; // Convert to SOL for comparison

          addActivity({
            type: amountSOL > 0.01 ? 'big_win' : 'win',
            playerAddress: result.player_address,
            amount: amountLamports,
            dice: result.dice_values || [1, 2, 3],
            result: result.result_type || 'win',
            timestamp: new Date(result.created_at)
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      delete window.addGameActivity;
    };
  }, []);

  // Function to get activity icon
  const getActivityIcon = (type, dice) => {
    if (type === 'big_win') return '🎉';
    if (dice && dice.length === 3) {
      if (dice[0] === dice[1] && dice[1] === dice[2]) return '🎯'; // Triple
      if (dice.includes(4) && dice.includes(5) && dice.includes(6)) return '🔥'; // 4-5-6
    }
    return '💰';
  };

  // Function to get time ago
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return `${hours}h ago`;
  };

  return (
    <div className="activity-feed-container">
      {/* Compact House Bank Section */}
      {treasuryData.balance !== null && (
        <div className="house-bank-compact">
          <div className="bank-info">
            <span className="bank-label">HOUSE BANK</span>
            <span className="bank-balance">{treasuryData.balance.toFixed(4)} SOL</span>
          </div>
          <div className="bank-status">
            <span className={`status-dot ${treasuryData.isMonitoring ? 'online' : 'offline'}`}></span>
            <span className="status-text">
              {treasuryData.isMonitoring ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      )}

      {/* Expanded Winners Section */}
      <div className="winners-section-expanded">
        <div className="winners-list-scrollable">
          {activities.length === 0 ? (
            <div className="no-activity-compact">
              <p>No recent activity</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className={`activity-item-compact ${activity.type === 'big_win' ? 'big-win' : ''}`}
              >
                <div className="activity-icon-small">
                  {getActivityIcon(activity.type, activity.dice)}
                </div>
                <div className="activity-content-compact">
                  <div className="activity-line">
                    <PlayerName
                      walletAddress={activity.playerAddress}
                      maxLength={6}
                      showYou={false}
                      className="player-name-compact"
                    />
                    <span className="won-text">won</span>
                    <span className="amount-compact">
                      {formatSOL(activity.amount)} SOL
                    </span>
                    <span className="time-compact">
                      {getTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <div className="dice-line">
                    [{activity.dice?.join('-')}] - {activity.result}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for other components to add activities
export const useActivityFeed = () => {
  const addWin = (playerAddress, amount, dice, result) => {
    if (window.addGameActivity) {
      const type = amount > 10000000 ? 'big_win' : 'win'; // 0.01 SOL threshold for big win
      window.addGameActivity({
        type,
        playerAddress,
        amount,
        dice,
        result
      });
    }
  };

  return { addWin };
};

// Default export for backward compatibility
export default ActivityFeed;
