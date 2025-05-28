type DiceRoll = [number, number, number];

/**
 * Generates a 3-dice roll based on a seed string
 */
export function rollDice(seed: string): DiceRoll {
  // Convert seed to a numeric value
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash to generate 3 dice values (1-6)
  const dice: DiceRoll = [0, 0, 0].map((_, i) => {
    // Use different parts of the hash for each die
    const value = Math.abs((hash >> (i * 8)) % 6) + 1;
    return value;
  }) as DiceRoll;
  
  return dice;
}

/**
 * Resolves a Cee-Lo dice roll according to the game rules
 */
export function resolveCeelo(dice: DiceRoll): { 
  outcome: "win" | "lose" | "point" | "reroll", 
  point?: 2 | 3 | 4 | 5 
} {
  // Sort the dice for easier pattern matching
  const sortedDice = [...dice].sort();
  
  // Check for 4-5-6 (automatic win)
  if (JSON.stringify(sortedDice) === JSON.stringify([4, 5, 6])) {
    return { outcome: "win" };
  }
  
  // Check for triples (automatic win)
  if (sortedDice[0] === sortedDice[1] && sortedDice[1] === sortedDice[2]) {
    return { outcome: "win" };
  }
  
  // Check for 1-2-3 (automatic loss)
  if (JSON.stringify(sortedDice) === JSON.stringify([1, 2, 3])) {
    return { outcome: "lose" };
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
      return { outcome: "point", point };
    }
  }
  
  // If no pattern matches, it's a reroll
  return { outcome: "reroll" };
}
