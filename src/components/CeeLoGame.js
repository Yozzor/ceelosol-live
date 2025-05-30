import React, { useState, forwardRef, useImperativeHandle } from 'react';
import './CeeLoGame.css';
import Dice3D from './Dice3D';
import diceSound from '../assets/dicesound.mp3';

/**
 * Complete Cee-Lo Dice Game Component
 * Rules:
 * - 4-5-6 OR triples → WIN
 * - 1-2-3 → LOSE
 * - pair+odd → POINT (odd number is the point)
 * - else → REROLL
 */

// Individual Dice Component (now using 3D dice)
function Dice({ value, isRolling, index }) {
  return (
    <Dice3D
      value={value}
      isRolling={isRolling}
      index={index}
    />
  );
}

// Game Logic Functions
function generateRandomDice() {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
}

function resolveCeeLo(dice) {
  const sorted = [...dice].sort((a, b) => a - b);

  // Check for 4-5-6 (automatic win - highest rank)
  if (sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6) {
    return { outcome: 'win', message: '4-5-6! Instant Win!', rank: 1000 };
  }

  // Check for triples (automatic win - ranked by value)
  if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) {
    const tripleValue = sorted[0];
    return {
      outcome: 'win',
      message: `Triple ${tripleValue}s! Instant Win!`,
      rank: 900 + tripleValue,
      tripleValue
    };
  }

  // Check for 1-2-3 (automatic loss)
  if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
    return { outcome: 'lose', message: '1-2-3! Instant Loss!', rank: 0 };
  }

  // Check for pair + odd (point)
  if (sorted[0] === sorted[1]) {
    const point = sorted[2];
    if (point >= 2 && point <= 5) {
      return {
        outcome: 'point',
        point,
        message: `Point: ${point}`,
        rank: 100 + point
      };
    }
  } else if (sorted[1] === sorted[2]) {
    const point = sorted[0];
    if (point >= 2 && point <= 5) {
      return {
        outcome: 'point',
        point,
        message: `Point: ${point}`,
        rank: 100 + point
      };
    }
  }

  // No valid combination - indeterminate (will be compared at round end)
  return { outcome: 'reroll', message: 'Indeterminate - Wait for round end', rank: -1 };
}

// Main Game Component
export const CeeLoGame = forwardRef(({ stakeLamports, onResult, disabled = false, disabledReason = 'SET BET AMOUNT FIRST' }, ref) => {
  const [dice, setDice] = useState([1, 1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [rollCount, setRollCount] = useState(0);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    animateRoll: (newDice) => {
      // Animate dice to show other player's roll in real-time
      animateToResult(newDice);
    }
  }));

  const animateToResult = async (targetDice) => {
    if (isRolling) return;

    setIsRolling(true);
    setGameResult(null);

    // Play dice sound effect
    try {
      const audio = new Audio(diceSound);
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.log('Audio not available:', error);
    }

    // Animate rolling for 1.5 seconds
    const rollDuration = 1500;
    const rollInterval = 100;
    const rollSteps = rollDuration / rollInterval;

    for (let i = 0; i < rollSteps; i++) {
      const randomDice = generateRandomDice();
      setDice(randomDice);
      await new Promise(resolve => setTimeout(resolve, rollInterval));
    }

    // Show final result
    setDice(targetDice);
    const result = resolveCeeLo(targetDice);
    setGameResult(result);
    setIsRolling(false);
  };

  const rollDice = async () => {
    if (isRolling || disabled) {
      console.log('🎲 Roll blocked - already rolling or disabled');
      return;
    }

    setIsRolling(true);
    setGameResult(null);
    setRollCount(prev => prev + 1);

    // Play dice sound effect
    try {
      const audio = new Audio(diceSound);
      audio.volume = 0.4; // Adjust volume
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.log('Audio not available:', error);
    }

    // Animate rolling for 2 seconds
    const rollDuration = 2000;
    const rollInterval = 100;
    const rollSteps = rollDuration / rollInterval;

    for (let i = 0; i < rollSteps; i++) {
      const randomDice = generateRandomDice();
      setDice(randomDice);
      await new Promise(resolve => setTimeout(resolve, rollInterval));
    }

    // Final roll
    const finalDice = generateRandomDice();
    setDice(finalDice);

    // Resolve game
    const result = resolveCeeLo(finalDice);
    setGameResult(result);

    // Call parent callback with result (but don't wait for backend)
    if (onResult) {
      try {
        await onResult({
          dice: finalDice,
          outcome: result.outcome,
          point: result.point,
          rollCount
        });
      } catch (error) {
        console.log('Backend connection failed, but game result is valid:', error);
        // Game continues to work even if backend fails
      }
    }

    // Add small delay before allowing next roll to prevent double-clicks
    setTimeout(() => {
      setIsRolling(false);
    }, 500);
  };

  return (
    <div className="ceelo-game">
      {/* Game Title */}
      <div className="game-title">
        <h2>CEE-LO DICE GAME</h2>
        <div className="rules-summary">
          4-5-6 = INSTANT WIN • Triples = INSTANT WIN • 1-2-3 = INSTANT LOSS • Pair+Odd = POINT • Else = INDETERMINATE
        </div>
      </div>

      {/* Dice Container */}
      <div className="dice-container">
        {dice.map((value, index) => (
          <Dice
            key={index}
            value={value}
            isRolling={isRolling}
            index={index}
          />
        ))}
      </div>

      {/* Roll Button */}
      <div className="controls">
        <button
          className="roll-button"
          onClick={rollDice}
          disabled={isRolling || disabled}
          style={{
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          {disabled ? disabledReason : isRolling ? 'ROLLING...' : 'ROLL DICE'}
        </button>
      </div>

      {/* Game Result */}
      {gameResult && (
        <div className={`game-result ${gameResult.outcome}`}>
          <div className="result-message">{gameResult.message}</div>
          <div className="dice-display">
            Rolled: {dice.join(' - ')}
          </div>
        </div>
      )}

      {/* Roll Counter */}
      <div className="roll-counter">
        Roll #{rollCount}
      </div>
    </div>
  );
});
