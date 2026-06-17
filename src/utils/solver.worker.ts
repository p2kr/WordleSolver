import { getPattern } from './wordle';

export interface WordEntropy {
  word: string;
  entropy: number;
  isPossibleSolution: boolean;
}

self.onmessage = (event: MessageEvent) => {
  const { possibleWords, allAllowedGuesses } = event.data;

  if (!possibleWords || possibleWords.length === 0) {
    self.postMessage([]);
    return;
  }

  const result: WordEntropy[] = [];
  const len = possibleWords.length;
  
  if (len === 1) {
    self.postMessage([{ word: possibleWords[0], entropy: 0, isPossibleSolution: true }]);
    return;
  }

  const isPossibleSet = new Set(possibleWords);
  const counts = new Uint16Array(243);

  // Calculate entropy for each allowed guess
  for (let i = 0; i < allAllowedGuesses.length; i++) {
    const guess = allAllowedGuesses[i];
    counts.fill(0);

    for (let j = 0; j < possibleWords.length; j++) {
      const p = getPattern(guess, possibleWords[j]);
      counts[p]++;
    }

    let sum = 0;
    for (let p = 0; p < 243; p++) {
      const c = counts[p];
      if (c > 0) {
        sum += c * Math.log2(c);
      }
    }
    
    const entropy = Math.log2(len) - sum / len;
    
    result.push({
      word: guess,
      entropy,
      isPossibleSolution: isPossibleSet.has(guess)
    });
  }

  // Sort by entropy descending. If entropy is equal, prefer words that are possible solutions.
  result.sort((a, b) => {
    if (Math.abs(a.entropy - b.entropy) < 1e-6) {
      if (a.isPossibleSolution && !b.isPossibleSolution) return -1;
      if (!a.isPossibleSolution && b.isPossibleSolution) return 1;
      return a.word.localeCompare(b.word);
    }
    return b.entropy - a.entropy;
  });

  self.postMessage(result);
};
