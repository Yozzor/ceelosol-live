"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revealHandler = revealHandler;
const ceelo_1 = require("../lib/ceelo");
const crypto_1 = require("crypto");
// import { getConnection } from '../../packages/shared/src/rpc';
async function revealHandler(req, res) {
    try {
        const { commit, clientSeed } = req.body;
        if (!commit || !clientSeed) {
            return res.status(400).json({
                success: false,
                error: 'Commit and client seed are required'
            });
        }
        // Verify the commit matches the client seed
        const calculatedCommit = (0, crypto_1.createHash)('sha256').update(clientSeed).digest('hex');
        if (commit !== calculatedCommit) {
            return res.status(400).json({
                success: false,
                error: 'Invalid commit or client seed'
            });
        }
        // Use the client seed to generate the dice roll
        const dice = (0, ceelo_1.rollDice)(clientSeed);
        const result = (0, ceelo_1.resolveCeelo)(dice);
        // Return the result
        res.json({
            success: true,
            dice,
            outcome: result.outcome,
            point: result.point
        });
    }
    catch (error) {
        console.error('Error in reveal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process reveal'
        });
    }
}
