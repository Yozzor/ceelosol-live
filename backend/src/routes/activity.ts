import { Request, Response } from 'express';

// In-memory storage for game results (in production, use a database)
interface GameResult {
  signature: string;
  playerAddress: string;
  dice: number[];
  outcome: 'win' | 'lose' | 'point' | 'reroll';
  amount: number;
  timestamp: Date;
  result: string;
}

const gameResults: GameResult[] = [];

// Store a game result
export const storeGameResult = (req: Request, res: Response) => {
  try {
    const { signature, playerAddress, dice, outcome, amount, result } = req.body;

    if (!signature || !playerAddress || !dice || !outcome || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const gameResult: GameResult = {
      signature,
      playerAddress,
      dice: Array.isArray(dice) ? dice : [],
      outcome,
      amount: Number(amount),
      timestamp: new Date(),
      result: result || 'Game completed'
    };

    // Store the result
    gameResults.push(gameResult);

    // Keep only last 100 results to prevent memory issues
    if (gameResults.length > 100) {
      gameResults.splice(0, gameResults.length - 100);
    }

    console.log('📊 Stored game result:', {
      player: playerAddress.slice(0, 4) + '...' + playerAddress.slice(-4),
      outcome,
      amount: amount / 1000000000,
      dice
    });

    res.json({ success: true, stored: gameResult });
  } catch (error) {
    console.error('Error storing game result:', error);
    res.status(500).json({ error: 'Failed to store game result' });
  }
};

// Get recent wins for activity feed
export const getRecentWins = (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Filter for wins only and sort by timestamp
    const recentWins = gameResults
      .filter(result => result.outcome === 'win')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map(result => ({
        playerAddress: result.playerAddress,
        dice: result.dice,
        amount: result.amount,
        timestamp: result.timestamp,
        result: result.result,
        signature: result.signature
      }));

    res.json({ wins: recentWins });
  } catch (error) {
    console.error('Error getting recent wins:', error);
    res.status(500).json({ error: 'Failed to get recent wins' });
  }
};

// Get game result by signature
export const getGameResult = (req: Request, res: Response) => {
  try {
    const { signature } = req.params;
    
    const result = gameResults.find(r => r.signature === signature);
    
    if (!result) {
      return res.status(404).json({ error: 'Game result not found' });
    }

    res.json({ result });
  } catch (error) {
    console.error('Error getting game result:', error);
    res.status(500).json({ error: 'Failed to get game result' });
  }
};

// Get activity statistics
export const getActivityStats = (req: Request, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentResults = gameResults.filter(r => r.timestamp >= oneDayAgo);
    
    const stats = {
      totalGames: recentResults.length,
      wins: recentResults.filter(r => r.outcome === 'win').length,
      losses: recentResults.filter(r => r.outcome === 'lose').length,
      totalWinAmount: recentResults
        .filter(r => r.outcome === 'win')
        .reduce((sum, r) => sum + r.amount, 0),
      uniquePlayers: new Set(recentResults.map(r => r.playerAddress)).size,
      lastActivity: gameResults.length > 0 ? gameResults[gameResults.length - 1].timestamp : null
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({ error: 'Failed to get activity stats' });
  }
};
