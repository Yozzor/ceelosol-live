import { supabase } from './supabaseClient';

/**
 * Service for managing game results in Supabase
 */
export class GameResultsService {
  /**
   * Add a new game result to the database
   * @param {string} winnerWallet - Winner's wallet address
   * @param {number} winnings - Amount won in SOL
   * @param {string} gameType - Type of game (PVP, Single, etc.)
   * @param {Array} diceRoll - Array of dice values [1,2,3]
   * @returns {Promise<boolean>} Success status
   */
  static async addGameResult(winnerWallet, winnings, gameType = 'PVP', diceRoll = []) {
    try {
      console.log('📊 Adding game result to database:', {
        winnerWallet,
        winnings,
        gameType,
        diceRoll
      });

      const { data, error } = await supabase
        .from('game_results')
        .insert([
          {
            winner_wallet: winnerWallet,
            winnings: winnings,
            game_type: gameType,
            dice_roll: JSON.stringify(diceRoll),
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Error adding game result:', error);
        return false;
      }

      console.log('✅ Game result added successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to add game result:', error);
      return false;
    }
  }

  /**
   * Add a chat message to the database
   * @param {string} walletAddress - Sender's wallet address
   * @param {string} message - Message content
   * @returns {Promise<boolean>} Success status
   */
  static async addChatMessage(walletAddress, message) {
    try {
      console.log('💬 Adding chat message to database:', {
        walletAddress,
        message: message.substring(0, 50) + '...'
      });

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            player_address: walletAddress,
            message: message,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Error adding chat message:', error);
        return false;
      }

      console.log('✅ Chat message added successfully');
      return true;
    } catch (error) {
      console.error('Failed to add chat message:', error);
      return false;
    }
  }

  /**
   * Get recent game results
   * @param {number} limit - Number of results to fetch
   * @returns {Promise<Array>} Array of game results
   */
  static async getRecentResults(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('game_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching game results:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch game results:', error);
      return [];
    }
  }

  /**
   * Get recent chat messages
   * @param {number} limit - Number of messages to fetch
   * @returns {Promise<Array>} Array of chat messages
   */
  static async getRecentMessages(limit = 100) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching chat messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
      return [];
    }
  }
}

export default GameResultsService;
