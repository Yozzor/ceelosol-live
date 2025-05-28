import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  useToast,
  Image,
  Spinner
} from '@chakra-ui/react';
import './DiceTable.css';

interface DiceTableProps {
  stakeLamports: number;
  onResult?: (result: GameResult) => void;
}

interface GameResult {
  dice: [number, number, number];
  outcome: 'win' | 'lose' | 'point' | 'reroll';
  point?: 2 | 3 | 4 | 5;
}

export function DiceTable({ stakeLamports, onResult }: DiceTableProps) {
  const [dice, setDice] = useState<[number, number, number]>([1, 1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const toast = useToast();

  // Generate a random client seed (32 random bytes as hex)
  const generateClientSeed = (): string => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Animate dice rolling
  const animateDice = async () => {
    // Roll animation - show random dice faces rapidly
    for (let i = 0; i < 10; i++) {
      const randomDice: [number, number, number] = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      setDice(randomDice);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // Handle the roll dice action
  const handleRollDice = async () => {
    try {
      setIsRolling(true);
      setGameResult(null);

      // Generate client seed
      const clientSeed = generateClientSeed();

      // Start the game by getting a commit from the server
      const startResponse = await fetch('/api/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stakeLamports,
          clientSeed
        }),
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start game');
      }

      const startData = await startResponse.json();
      const { commit } = startData;

      // Animate dice while waiting
      await animateDice();

      // Reveal the result
      const revealResponse = await fetch('/api/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit,
          clientSeed
        }),
      });

      if (!revealResponse.ok) {
        throw new Error('Failed to reveal result');
      }

      const revealData = await revealResponse.json();
      const result: GameResult = {
        dice: revealData.dice,
        outcome: revealData.outcome,
        point: revealData.point
      };

      // Set the final dice values
      setDice(result.dice);
      setGameResult(result);

      // Show toast with outcome
      let toastMessage = '';
      let toastStatus: 'success' | 'error' | 'info' | 'warning' = 'info';

      switch (result.outcome) {
        case 'win':
          toastMessage = 'You win!';
          toastStatus = 'success';
          break;
        case 'lose':
          toastMessage = 'You lose!';
          toastStatus = 'error';
          break;
        case 'point':
          toastMessage = `Point: ${result.point}`;
          toastStatus = 'info';
          break;
        case 'reroll':
          toastMessage = 'Reroll!';
          toastStatus = 'warning';
          break;
      }

      toast({
        title: 'Game Result',
        description: toastMessage,
        status: toastStatus,
        duration: 5000,
        isClosable: true,
      });

      // Call the onResult callback if provided
      if (onResult) {
        onResult(result);
      }
    } catch (error) {
      console.error('Error rolling dice:', error);
      toast({
        title: 'Error',
        description: 'Failed to roll dice. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <Box>
      <div className="dice-container">
        {dice.map((value, index) => (
          <div
            key={index}
            className={`dice ${isRolling ? 'dice-rolling' : ''}`}
          >
            <Image
              src={`/assets/dice-${value}.svg`}
              alt={`Dice ${value}`}
              width="100%"
              height="100%"
            />
          </div>
        ))}
      </div>

      {gameResult && (
        <div className={`result-text ${gameResult.outcome}`}>
          {gameResult.outcome === 'win' && 'You Win!'}
          {gameResult.outcome === 'lose' && 'You Lose!'}
          {gameResult.outcome === 'point' && `Point: ${gameResult.point}`}
          {gameResult.outcome === 'reroll' && 'Reroll!'}
        </div>
      )}

      <Button
        colorScheme="blue"
        size="lg"
        width="100%"
        onClick={handleRollDice}
        isDisabled={isRolling}
      >
        {isRolling ? <Spinner size="sm" mr={2} /> : null}
        {isRolling ? 'Rolling...' : 'Roll Dice'}
      </Button>
    </Box>
  );
}
