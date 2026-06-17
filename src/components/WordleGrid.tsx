import React from 'react';

export interface Guess {
  word: string;
  pattern: number[];
}

interface WordleGridProps {
  guesses: Guess[];
  activeRowIndex: number;
  activeColIndex: number;
  onGuessesChange: (guesses: Guess[]) => void;
  onCellFocus: (row: number, col: number) => void;
}

export const WordleGrid: React.FC<WordleGridProps> = ({
  guesses,
  activeRowIndex,
  activeColIndex,
  onGuessesChange,
  onCellFocus
}) => {
  
  const handleTileClick = (rowIndex: number, colIndex: number) => {
    onCellFocus(rowIndex, colIndex);

    // If there is a letter, cycle its pattern state
    const guess = guesses[rowIndex];
    if (guess.word[colIndex]) {
      const newGuesses = [...guesses];
      const newPattern = [...newGuesses[rowIndex].pattern];
      // Cycle: 0 (absent) -> 1 (present) -> 2 (correct) -> 0
      newPattern[colIndex] = (newPattern[colIndex] + 1) % 3;
      newGuesses[rowIndex] = {
        ...newGuesses[rowIndex],
        pattern: newPattern
      };
      onGuessesChange(newGuesses);
    }
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (guesses.length <= 1) {
      // Clear the first row rather than deleting it
      const newGuesses = [{ word: '', pattern: [0, 0, 0, 0, 0] }];
      onGuessesChange(newGuesses);
      onCellFocus(0, 0);
      return;
    }

    const newGuesses = guesses.filter((_, idx) => idx !== rowIndex);
    onGuessesChange(newGuesses);
    
    // Adjust focus
    const newActiveRow = Math.min(activeRowIndex, newGuesses.length - 1);
    onCellFocus(newActiveRow, 0);
  };

  const handleAddRow = () => {
    const newGuesses = [...guesses, { word: '', pattern: [0, 0, 0, 0, 0] }];
    onGuessesChange(newGuesses);
    onCellFocus(newGuesses.length - 1, 0);
  };

  return (
    <div className="wordle-board">
      {guesses.map((guess, rowIndex) => {
        // Ensure word length is 5 padded with spaces
        const paddedWord = guess.word.padEnd(5, ' ');

        return (
          <div key={rowIndex} className={`wordle-row ${activeRowIndex === rowIndex ? 'active' : ''}`}>
            {[0, 1, 2, 3, 4].map((colIndex) => {
              const char = paddedWord[colIndex];
              const patternVal = guess.pattern[colIndex];
              const isFocused = activeRowIndex === rowIndex && activeColIndex === colIndex;
              const hasLetter = char !== ' ';
              
              let stateClass = '';
              if (hasLetter) {
                if (patternVal === 2) stateClass = 'state-correct';
                else if (patternVal === 1) stateClass = 'state-present';
                else stateClass = 'state-absent';
              }

              return (
                <div
                  key={colIndex}
                  className={`wordle-tile ${isFocused ? 'focused' : ''} ${hasLetter ? 'filled' : ''} ${stateClass}`}
                  onClick={() => handleTileClick(rowIndex, colIndex)}
                >
                  {char}
                </div>
              );
            })}

            {/* Row Helper Actions */}
            <div className="row-actions">
              <button
                className="action-dot-btn danger"
                title="Delete this guess"
                onClick={() => handleDeleteRow(rowIndex)}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      {/* Button to add a new guess row */}
      {guesses.length < 8 && (
        <button
          className="btn-primary"
          style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={handleAddRow}
        >
          <span>+</span> Add Guess Row
        </button>
      )}
    </div>
  );
};
