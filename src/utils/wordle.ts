/**
 * Computes the Wordle feedback pattern for a guess against a secret word.
 * Pattern encoding:
 * 0 = Absent (Gray)
 * 1 = Present (Yellow)
 * 2 = Correct (Green)
 * 
 * Returns a unique base-3 integer representing the pattern (0 to 242).
 */
export function getPattern(guess: string, secret: string): number {
  const pattern = [0, 0, 0, 0, 0];
  const secretUsed = [false, false, false, false, false];
  const guessUsed = [false, false, false, false, false];

  // First pass: Correct position (Green)
  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) {
      pattern[i] = 2;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // Second pass: Wrong position but present (Yellow)
  for (let i = 0; i < 5; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < 5; j++) {
      if (!secretUsed[j] && guess[i] === secret[j]) {
        pattern[i] = 1;
        secretUsed[j] = true;
        break;
      }
    }
  }

  // Convert 5-digit base-3 pattern to single integer
  let code = 0;
  for (let i = 0; i < 5; i++) {
    code = code * 3 + pattern[i];
  }
  return code;
}

/**
 * Encodes a 5-element pattern array into a single integer.
 */
export function patternToCode(pattern: number[]): number {
  let code = 0;
  for (let i = 0; i < 5; i++) {
    code = code * 3 + pattern[i];
  }
  return code;
}

/**
 * Decodes a single integer into a 5-element pattern array.
 */
export function codeToPattern(code: number): number[] {
  const pattern = [0, 0, 0, 0, 0];
  let temp = code;
  for (let i = 4; i >= 0; i--) {
    pattern[i] = temp % 3;
    temp = Math.floor(temp / 3);
  }
  return pattern;
}

/**
 * Filters the list of possible secret words based on the feedback from a guess.
 */
export function filterWords(possibleWords: string[], guess: string, patternCode: number): string[] {
  return possibleWords.filter(word => getPattern(guess, word) === patternCode);
}

import { SOLUTIONS, ALLOWED_GUESSES } from '../data/words';

/**
 * Pre-computed top starting words for the first turn (when no feedback is available).
 * Taken from standard information theory analysis on the 2315 Wordle solutions list.
 */
export const TOP_STARTING_WORDS = [
  { word: 'salet', entropy: 3.421, isPossibleSolution: true },
  { word: 'reast', entropy: 3.411, isPossibleSolution: false },
  { word: 'tarse', entropy: 3.407, isPossibleSolution: false },
  { word: 'rates', entropy: 3.402, isPossibleSolution: false },
  { word: 'stare', entropy: 3.398, isPossibleSolution: true },
  { word: 'tares', entropy: 3.397, isPossibleSolution: false },
  { word: 'slate', entropy: 3.396, isPossibleSolution: true },
  { word: 'aeons', entropy: 3.376, isPossibleSolution: false },
  { word: 'crane', entropy: 3.373, isPossibleSolution: true },
  { word: 'roate', entropy: 3.355, isPossibleSolution: false }
];

/**
 * Full suggestions list for the first turn, containing all SOLUTIONS and ALLOWED_GUESSES.
 * The top 10 have their precomputed entropy, while the rest default to 0.
 */
export const INITIAL_SUGGESTIONS = (() => {
  const topSet = new Set(TOP_STARTING_WORDS.map(w => w.word));
  
  // Map starting words and ensure their solution status is accurate
  const list = TOP_STARTING_WORDS.map(w => ({
    ...w,
    isPossibleSolution: SOLUTIONS.includes(w.word)
  }));
  
  // Add remaining solutions
  for (const word of SOLUTIONS) {
    if (!topSet.has(word)) {
      list.push({
        word,
        entropy: 0,
        isPossibleSolution: true
      });
    }
  }

  // Add remaining allowed guesses (filler words)
  for (const word of ALLOWED_GUESSES) {
    if (!topSet.has(word)) {
      list.push({
        word,
        entropy: 0,
        isPossibleSolution: false
      });
    }
  }
  
  return list;
})();
