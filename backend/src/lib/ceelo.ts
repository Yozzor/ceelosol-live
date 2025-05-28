import { createHash } from 'crypto';

type DiceRoll = [number, number, number];

/**
 * Generates a 3-dice roll based on a seed string
 */
export function rollDice(seed: string): DiceRoll {
  // Create a hash from the seed
  const hash = createHash('sha256').update(seed).digest('hex');

  // Use parts of the hash to generate 3 dice values (1-6)
  const dice: DiceRoll = [0, 0, 0].map((_, i) => {
    // Take 2 characters from the hash at different positions
    const hexPart = hash.substring(i * 8, i * 8 + 8);
    // Convert to a number and get a value between 1-6
    const num = (parseInt(hexPart, 16) % 6) + 1;
    return num;
  }) as DiceRoll;

  return dice;
}

/**
 * Resolves a Cee-Lo dice roll according to the game rules
 */
export function resolveCeelo(dice: DiceRoll): {
  outcome: "win" | "lose" | "point" | "reroll",
  point?: 2 | 3 | 4 | 5,
  rank?: number,
  tripleValue?: number
} {
  // Sort the dice for easier pattern matching
  const sortedDice = [...dice].sort();

  // Check for 4-5-6 (automatic win - highest rank)
  if (JSON.stringify(sortedDice) === JSON.stringify([4, 5, 6])) {
    return { outcome: "win", rank: 1000 }; // Highest possible rank
  }

  // Check for triples (automatic win - ranked by triple value)
  if (sortedDice[0] === sortedDice[1] && sortedDice[1] === sortedDice[2]) {
    const tripleValue = sortedDice[0];
    return {
      outcome: "win",
      rank: 900 + tripleValue, // 906 for 6-6-6, 905 for 5-5-5, etc.
      tripleValue
    };
  }

  // Check for 1-2-3 (automatic loss)
  if (JSON.stringify(sortedDice) === JSON.stringify([1, 2, 3])) {
    return { outcome: "lose", rank: 0 };
  }

  // Check for pair + odd (point)
  if (sortedDice[0] === sortedDice[1] || sortedDice[1] === sortedDice[2]) {
    let point: 2 | 3 | 4 | 5;

    if (sortedDice[0] === sortedDice[1]) {
      point = sortedDice[2] as 2 | 3 | 4 | 5;
    } else {
      point = sortedDice[0] as 2 | 3 | 4 | 5;
    }

    // Ensure point is valid (2-5)
    if (point >= 2 && point <= 5) {
      return {
        outcome: "point",
        point,
        rank: 100 + point // 106 for point 6, 105 for point 5, etc.
      };
    }
  }

  // If no pattern matches, it's a reroll
  return { outcome: "reroll", rank: -1 };
}

/**
 * Compare two Cee-Lo results to determine winner
 * Returns: 1 if result1 wins, -1 if result2 wins, 0 if tie
 */
export function compareCeeloResults(
  result1: ReturnType<typeof resolveCeelo>,
  result2: ReturnType<typeof resolveCeelo>
): number {
  // If either has reroll, they can't win
  if (result1.outcome === "reroll" && result2.outcome === "reroll") return 0;
  if (result1.outcome === "reroll") return -1;
  if (result2.outcome === "reroll") return 1;

  // If either has lose, they lose
  if (result1.outcome === "lose" && result2.outcome === "lose") return 0;
  if (result1.outcome === "lose") return -1;
  if (result2.outcome === "lose") return 1;

  // Compare by rank (higher rank wins)
  const rank1 = result1.rank || 0;
  const rank2 = result2.rank || 0;

  if (rank1 > rank2) return 1;
  if (rank1 < rank2) return -1;
  return 0;
}
