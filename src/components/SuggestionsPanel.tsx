import React, { useState, useRef } from 'react';
import type { WordEntropy } from '../utils/solver.worker';

interface SuggestionsPanelProps {
  possibleSolutionsCount: number;
  suggestions: WordEntropy[];
  loading: boolean;
  onSelectWord: (word: string) => void;
}

const ROW_HEIGHT = 44; // Must match the height of suggestions-list-row in CSS
const CONTAINER_HEIGHT = 380; // Must match height of suggestions-list-container in CSS
const BUFFER = 5; // Number of items to render outside the viewport on top and bottom

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  possibleSolutionsCount,
  suggestions,
  loading,
  onSelectWord
}) => {
  const [activeTab, setActiveTab] = useState<'solutions' | 'other'>('solutions');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // The best next guess is the first element in the sorted suggestions list
  const bestGuess = suggestions[0];

  // Filter recommendations based on tab and search query
  const filteredSuggestions = suggestions.filter((item) => {
    // Search query filter
    const matchesSearch = item.word.toLowerCase().includes(searchQuery.toLowerCase().trim());
    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === 'solutions') {
      return item.isPossibleSolution;
    }
    // 'other' tab shows filler words that are NOT possible solutions
    return !item.isPossibleSolution;
  });

  // Calculate statistics
  const currentEntropyBits = Math.log2(Math.max(1, possibleSolutionsCount));

  // Virtualization math
  const totalHeight = filteredSuggestions.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIndex = Math.min(filteredSuggestions.length, Math.ceil((scrollTop + CONTAINER_HEIGHT) / ROW_HEIGHT) + BUFFER);
  const visibleItems = filteredSuggestions.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleTabChange = (tab: 'solutions' | 'other') => {
    setActiveTab(tab);
    setScrollTop(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setScrollTop(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="glass-panel" style={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">Calculating best guesses...</p>
        </div>
      )}

      <div className="grid-panel-header">
        <h2 className="panel-title">
          <span>🔍</span> Solver Recommendations
        </h2>
        <span className="panel-subtitle">Calculated in real-time</span>
      </div>

      {/* Solver Stats */}
      <div className="solver-stats-grid">
        <div className="stat-card">
          <div className="stat-value">{possibleSolutionsCount}</div>
          <div className="stat-label">Possible Words</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{currentEntropyBits.toFixed(2)}</div>
          <div className="stat-label">Remaining Bits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {bestGuess ? bestGuess.entropy.toFixed(3) : '0.000'}
          </div>
          <div className="stat-label">Max Info Gain</div>
        </div>
      </div>

      {/* Recommended Best Guess */}
      <div className="recommended-box">
        {possibleSolutionsCount === 0 ? (
          <>
            <div className="recommended-header" style={{ color: '#ef4444' }}>
              No Words Match
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
              No possible solutions match the current board constraints. Please check for conflicting tile colors or letters.
            </div>
          </>
        ) : possibleSolutionsCount === 1 ? (
          <>
            <div className="recommended-header" style={{ color: 'var(--color-correct)' }}>
              Solution Found!
            </div>
            <div className="recommended-body">
              <div
                className="recommended-word"
                style={{ color: 'var(--color-correct)', cursor: 'pointer' }}
                onClick={() => onSelectWord(bestGuess.word)}
                title="Click to apply"
              >
                {bestGuess?.word}
              </div>
              <div className="recommended-meta">
                <div className="recommended-entropy" style={{ color: 'var(--color-correct)' }}>
                  100%
                </div>
                <div className="recommended-entropy-label">Confidence</div>
              </div>
            </div>
          </>
        ) : (
          (() => {
            const bestInfoGuess = suggestions[0];
            const bestSolGuess = suggestions.find(s => s.isPossibleSolution);
            const showTwo = bestInfoGuess && bestSolGuess && bestInfoGuess.word !== bestSolGuess.word;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: showTwo ? '1fr 1fr' : '1fr', gap: '16px' }}>
                  {bestInfoGuess && (
                    <div>
                      <div className="recommended-header" style={{ fontSize: '0.65rem' }}>
                        Best Info Guess {bestInfoGuess.isPossibleSolution ? '(Solution)' : '(Filler)'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div
                          className="recommended-word"
                          style={{ cursor: 'pointer', fontSize: showTwo ? '1.75rem' : '2.25rem' }}
                          onClick={() => onSelectWord(bestInfoGuess.word)}
                          title="Click to apply to active row"
                        >
                          {bestInfoGuess.word}
                        </div>
                        <div className="recommended-meta">
                          <div className="recommended-entropy" style={{ fontSize: showTwo ? '0.95rem' : '1.125rem' }}>
                            {bestInfoGuess.entropy.toFixed(3)}
                          </div>
                          <div className="recommended-entropy-label">Bits</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showTwo && bestSolGuess && (
                    <div style={{ borderLeft: '1.5px solid var(--text-muted)', paddingLeft: '16px' }}>
                      <div className="recommended-header" style={{ fontSize: '0.65rem', color: 'var(--color-correct)' }}>
                        Best Possible Solution
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div
                          className="recommended-word"
                          style={{ cursor: 'pointer', fontSize: '1.75rem', color: 'var(--color-correct)' }}
                          onClick={() => onSelectWord(bestSolGuess.word)}
                          title="Click to apply to active row"
                        >
                          {bestSolGuess.word}
                        </div>
                        <div className="recommended-meta">
                          <div className="recommended-entropy" style={{ fontSize: '0.95rem', color: 'var(--color-correct)' }}>
                            {bestSolGuess.entropy.toFixed(3)}
                          </div>
                          <div className="recommended-entropy-label">Bits</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Tab Switcher */}
      <div className="tab-header">
        <button
          className={`tab-btn ${activeTab === 'solutions' ? 'active' : ''}`}
          onClick={() => handleTabChange('solutions')}
        >
          Possible Answers ({suggestions.filter(s => s.isPossibleSolution).length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => handleTabChange('other')}
        >
          Other Guesses ({suggestions.filter(s => !s.isPossibleSolution).length})
        </button>
      </div>

      {/* List Search Control */}
      <div className="list-controls">
        <input
          type="text"
          placeholder="Filter words list..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Word Suggestions List Header (sticky) */}
      <div className="suggestions-header-row">
        <div style={{ padding: '0 16px' }}>Word</div>
        <div style={{ padding: '0 16px' }}>Expected Info (Bits)</div>
        <div style={{ padding: '0 16px' }}>Type</div>
      </div>

      {/* Word Suggestions List Table */}
      <div 
        ref={containerRef}
        className="suggestions-list-container"
        onScroll={handleScroll}
        style={{ position: 'relative', overflowY: 'auto' }}
      >
        {filteredSuggestions.length === 0 ? (
          <div className="suggestions-list-empty">
            {searchQuery ? 'No matching words found' : 'No recommendations available'}
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', left: 0, right: 0 }}>
              {visibleItems.map((item) => (
                <div
                  key={item.word}
                  className="suggestions-list-row"
                  onClick={() => onSelectWord(item.word)}
                  title="Click to apply to active row"
                >
                  <div className="suggestions-list-cell">
                    <span className="cell-word">
                      {item.word}
                    </span>
                  </div>
                  <div className="suggestions-list-cell">
                    <span className="cell-entropy">{item.entropy.toFixed(3)} bits</span>
                  </div>
                  <div className="suggestions-list-cell">
                    {item.isPossibleSolution ? (
                      <span className="badge-sol">Possible Solution</span>
                    ) : (
                      <span className="badge-sol" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                        Filler Guess
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
