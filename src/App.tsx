import { useState, useEffect, useRef, useMemo } from 'react';
import { WordleGrid } from './components/WordleGrid';
import type { Guess } from './components/WordleGrid';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { SOLUTIONS, ALLOWED_GUESSES } from './data/words';
import { filterWords, patternToCode, INITIAL_SUGGESTIONS } from './utils/wordle';
import type { WordEntropy } from './utils/solver.worker';

// Combine all valid guesses for list checks
const COMBINED_WORDS = SOLUTIONS.concat(ALLOWED_GUESSES);
const VALID_WORDS_SET = new Set(COMBINED_WORDS);

export default function App() {
  // Theme state: default to dark mode for modern visual excellence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Main board guesses state
  const [guesses, setGuesses] = useState<Guess[]>([
    { word: '', pattern: [0, 0, 0, 0, 0] }
  ]);

  // Focused cell state
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [activeColIndex, setActiveColIndex] = useState(0);

  // Solver states
  const [possibleSolutions, setPossibleSolutions] = useState<string[]>(SOLUTIONS);
  const [suggestions, setSuggestions] = useState<WordEntropy[]>(INITIAL_SUGGESTIONS);
  const [loading, setLoading] = useState(false);

  // Overlay states
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Web Worker reference
  const workerRef = useRef<Worker | null>(null);

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toast helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // Initialize Web Worker for background computations
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./utils/solver.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent) => {
      setSuggestions(event.data);
      setLoading(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Update solver when guesses or validation patterns change
  useEffect(() => {
    // 1. Filter remaining possible solutions sequentially
    let filtered = SOLUTIONS;
    
    // We only filter by guesses that have a completed 5-letter word
    const completedGuesses = guesses.filter((g) => g.word.length === 5);
    
    for (const g of completedGuesses) {
      const patternCode = patternToCode(g.pattern);
      filtered = filterWords(filtered, g.word, patternCode);
    }

    setPossibleSolutions(filtered);

    // 2. Compute recommendations
    if (filtered.length === SOLUTIONS.length) {
      // First turn: use pre-calculated top starting words to save CPU cycle instantly
      setSuggestions(INITIAL_SUGGESTIONS);
      setLoading(false);
    } else if (filtered.length === 0) {
      // No possible solutions remain (user entered impossible constraint)
      setSuggestions([]);
      setLoading(false);
    } else {
      // Send task to Web Worker to keep main thread smooth and responsive
      setLoading(true);
      workerRef.current?.postMessage({
        possibleWords: filtered,
        allAllowedGuesses: COMBINED_WORDS
      });
    }
  }, [guesses]);

  // Insert a letter at the current focused cell
  const handleInputLetter = (letter: string) => {
    const cleanLetter = letter.toLowerCase();
    const newGuesses = [...guesses];
    const currentGuess = newGuesses[activeRowIndex];

    const wordChars = currentGuess.word.padEnd(5, ' ').split('');
    wordChars[activeColIndex] = cleanLetter;
    
    const newWord = wordChars.join('').trimEnd();

    newGuesses[activeRowIndex] = {
      ...currentGuess,
      word: newWord
    };

    setGuesses(newGuesses);

    // Move cursor forward
    if (activeColIndex < 4) {
      setActiveColIndex(activeColIndex + 1);
    }
  };

  // Handle backspace input
  const handleBackspace = () => {
    const newGuesses = [...guesses];
    const currentGuess = newGuesses[activeRowIndex];
    const wordChars = currentGuess.word.padEnd(5, ' ').split('');

    // If current cell has a letter, erase it but stay in place
    if (wordChars[activeColIndex] !== ' ') {
      wordChars[activeColIndex] = ' ';
      newGuesses[activeRowIndex] = {
        ...currentGuess,
        word: wordChars.join('').trimEnd()
      };
      setGuesses(newGuesses);
    } else if (activeColIndex > 0) {
      // Move cursor back and erase that letter
      const prevCol = activeColIndex - 1;
      wordChars[prevCol] = ' ';
      newGuesses[activeRowIndex] = {
        ...currentGuess,
        word: wordChars.join('').trimEnd()
      };
      setGuesses(newGuesses);
      setActiveColIndex(prevCol);
    }
  };

  // Submit current row and advance to next guess
  const handleRowSubmit = () => {
    const currentGuess = guesses[activeRowIndex];
    
    if (currentGuess.word.length < 5) {
      showToast('Word must be 5 letters');
      return;
    }

    if (!VALID_WORDS_SET.has(currentGuess.word)) {
      showToast('Not in word list');
      return;
    }

    // Move to next row
    if (activeRowIndex < guesses.length - 1) {
      setActiveRowIndex(activeRowIndex + 1);
      setActiveColIndex(0);
    } else if (guesses.length < 8) {
      // Automatically append a new row if we're not at the max limit (8 rows)
      setGuesses([...guesses, { word: '', pattern: [0, 0, 0, 0, 0] }]);
      setActiveRowIndex(guesses.length);
      setActiveColIndex(0);
    } else {
      showToast('Maximum guess rows reached');
    }
  };

  // Handle physical keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if modal is open or when typing in inputs (e.g. search filter)
      if (isHelpOpen || document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleRowSubmit();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleInputLetter(e.key);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeColIndex > 0) setActiveColIndex(activeColIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeColIndex < 4) setActiveColIndex(activeColIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeRowIndex > 0) {
          setActiveRowIndex(activeRowIndex - 1);
          // Clamp column index if needed
          const targetWordLen = guesses[activeRowIndex - 1].word.length;
          setActiveColIndex(Math.min(activeColIndex, Math.max(0, targetWordLen - 1)));
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeRowIndex < guesses.length - 1) {
          setActiveRowIndex(activeRowIndex + 1);
          const targetWordLen = guesses[activeRowIndex + 1].word.length;
          setActiveColIndex(Math.min(activeColIndex, Math.max(0, targetWordLen - 1)));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRowIndex, activeColIndex, guesses, isHelpOpen]);

  // Click handler to select suggestions
  const handleSelectSuggestedWord = (word: string) => {
    const newGuesses = [...guesses];
    // Overwrite the current active row word and reset pattern to gray (absent)
    newGuesses[activeRowIndex] = {
      word: word,
      pattern: [0, 0, 0, 0, 0]
    };
    setGuesses(newGuesses);
    // Focus the first cell of the filled word
    setActiveColIndex(0);
  };

  // Reset solver to initial state
  const handleReset = () => {
    setGuesses([{ word: '', pattern: [0, 0, 0, 0, 0] }]);
    setActiveRowIndex(0);
    setActiveColIndex(0);
    setPossibleSolutions(SOLUTIONS);
    setSuggestions(INITIAL_SUGGESTIONS);
    setLoading(false);
  };

  // Compile keyboard letter colors based on board states
  const keyStatuses = useMemo(() => {
    const statuses: Record<string, 'correct' | 'present' | 'absent'> = {};
    for (const g of guesses) {
      if (g.word.length !== 5) continue;
      for (let i = 0; i < 5; i++) {
        const char = g.word[i];
        const val = g.pattern[i];
        if (val === 2) {
          statuses[char] = 'correct';
        } else if (val === 1) {
          if (statuses[char] !== 'correct') {
            statuses[char] = 'present';
          }
        } else if (val === 0) {
          if (statuses[char] !== 'correct' && statuses[char] !== 'present') {
            statuses[char] = 'absent';
          }
        }
      }
    }
    return statuses;
  }, [guesses]);

  // Keyboard Rows layout
  const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['ENTER', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACK']
  ];

  return (
    <div className="app-container">
      {/* Toast popup notification */}
      {toastMessage && (
        <div 
          className="modal-overlay" 
          style={{ 
            background: 'transparent', 
            pointerEvents: 'none', 
            justifyContent: 'center', 
            alignItems: 'flex-start',
            paddingTop: '80px',
            zIndex: 2000
          }}
        >
          <div 
            style={{ 
              background: '#ef4444', 
              color: '#ffffff', 
              padding: '12px 24px', 
              borderRadius: 'var(--radius-sm)', 
              fontWeight: 700,
              boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
              animation: 'popIn 0.15s ease-out'
            }}
          >
            {toastMessage}
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">W</div>
          <h1 className="navbar-title">Wordle Solver</h1>
        </div>
        <div className="navbar-actions">
          <button 
            className="icon-btn" 
            onClick={() => setIsHelpOpen(true)}
            title="Help / Guide"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </button>
          <button 
            className="icon-btn" 
            onClick={handleReset}
            title="Clear and reset solver"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
          </button>
          <button 
            className="icon-btn" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid Dashboard */}
      <main className="dashboard-grid">
        {/* Left Section: Board Input Grid */}
        <section className="glass-panel">
          <div className="grid-panel-header">
            <h2 className="panel-title">
              <span>⌨️</span> Wordle Input Board
            </h2>
            <button className="btn-primary" onClick={handleReset} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Clear Board
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {/* Color Legend Bar */}
            <div className="legend-bar" style={{ marginTop: 0, marginBottom: '16px' }}>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'var(--color-absent)' }}></div>
                <span>Absent (Gray)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'var(--color-present)' }}></div>
                <span>Present (Yellow)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'var(--color-correct)' }}></div>
                <span>Correct (Green)</span>
              </div>
            </div>

            <WordleGrid
              guesses={guesses}
              activeRowIndex={activeRowIndex}
              activeColIndex={activeColIndex}
              onGuessesChange={setGuesses}
              onCellFocus={(r, c) => {
                setActiveRowIndex(r);
                setActiveColIndex(c);
              }}
            />

            {/* Virtual On-Screen Keyboard */}
            <div className="keyboard-helper">
              {KEYBOARD_ROWS.map((row, rIdx) => (
                <div key={rIdx} className="keyboard-row">
                  {row.map((key) => {
                    const isSpecial = key === 'ENTER' || key === 'BACK';
                    const status = keyStatuses[key.toLowerCase()];
                    let statusClass = '';
                    if (status === 'correct') statusClass = 'state-correct';
                    else if (status === 'present') statusClass = 'state-present';
                    else if (status === 'absent') statusClass = 'state-absent';

                    return (
                      <button
                        key={key}
                        className={`keyboard-key ${isSpecial ? 'wide' : ''} ${statusClass}`}
                        onClick={() => {
                          if (key === 'ENTER') handleRowSubmit();
                          else if (key === 'BACK') handleBackspace();
                          else handleInputLetter(key);
                        }}
                      >
                        {key === 'BACK' ? '⌫' : key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Section: Suggestions list and details */}
        <section style={{ height: '100%' }}>
          <SuggestionsPanel
            possibleSolutionsCount={possibleSolutions.length}
            suggestions={suggestions}
            loading={loading}
            onSelectWord={handleSelectSuggestedWord}
          />
        </section>
      </main>

      {/* Instructions Help Modal */}
      {isHelpOpen && (
        <div className="modal-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>How to use Wordle Solver</h2>
              <button className="modal-close" onClick={() => setIsHelpOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>This solver helps you find the mathematically optimal guesses in **Wordle** using information theory and entropy calculations.</p>
              
              <h3>Quick Start Guide</h3>
              <ul>
                <li><strong>1. Enter a Guess:</strong> Type a 5-letter word on the board using your keyboard or click a recommendation.</li>
                <li><strong>2. Match Tiles Color:</strong> Click on the letters in the active row to toggle their status:
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--color-absent)' }}>Gray (Absent)</span> →
                    <span style={{ color: 'var(--color-present)' }}>Yellow (Present)</span> →
                    <span style={{ color: 'var(--color-correct)' }}>Green (Correct)</span>
                  </div>
                </li>
                <li><strong>3. Submit:</strong> Press <strong>Enter</strong> to save the word, and the solver will filter possible words and calculate the best next guesses.</li>
                <li><strong>4. Edit at any stage:</strong> Click any cell in any previous row to change its color or edit its letters! The recommendations will update immediately.</li>
              </ul>

              <h3>Understanding the lists</h3>
              <ul>
                <li><strong>Possible Answers:</strong> Only words that are valid secrets that fit the constraints.</li>
                <li><strong>All Guesses (Max Info):</strong> Words that reveal the maximum information, even if they aren't potential answers. Great for separating tricky letters (e.g. -IGHT word endings!).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="footer">
        Wordle Solver © 2026 | Built for visual excellence & mathematical optimality
      </footer>
    </div>
  );
}
