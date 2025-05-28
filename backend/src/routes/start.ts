import { Request, Response } from 'express';
import { createHash } from 'crypto';
// import { getConnection } from '../../packages/shared/src/rpc';

export async function startHandler(req: Request, res: Response) {
  try {
    const { stakeLamports, clientSeed } = req.body;

    if (!clientSeed) {
      return res.status(400).json({
        success: false,
        error: 'Client seed is required'
      });
    }

    // Create a commit hash from the client seed
    const commit = createHash('sha256').update(clientSeed).digest('hex');

    // In a real implementation, we would store this commit in a database
    // along with the stake amount and other game details

    // Return the commit to the client
    res.json({
      success: true,
      commit
    });
  } catch (error) {
    console.error('Error in start:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game'
    });
  }
}
