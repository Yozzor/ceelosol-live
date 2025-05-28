import { Request, Response } from 'express';
import { rollDice, resolveCeelo } from '../lib/ceelo';
import { createHash } from 'crypto';
// import { getConnection } from '../../packages/shared/src/rpc';

export async function revealHandler(req: Request, res: Response) {
  try {
    const { commit, clientSeed } = req.body;

    if (!commit || !clientSeed) {
      return res.status(400).json({
        success: false,
        error: 'Commit and client seed are required'
      });
    }

    // Verify the commit matches the client seed
    const calculatedCommit = createHash('sha256').update(clientSeed).digest('hex');

    if (commit !== calculatedCommit) {
      return res.status(400).json({
        success: false,
        error: 'Invalid commit or client seed'
      });
    }

    // Use the client seed to generate the dice roll
    const dice = rollDice(clientSeed);
    const result = resolveCeelo(dice);

    // Return the result
    res.json({
      success: true,
      dice,
      outcome: result.outcome,
      point: result.point
    });
  } catch (error) {
    console.error('Error in reveal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process reveal'
    });
  }
}
