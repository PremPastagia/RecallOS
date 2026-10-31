import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';

export function Search() {
  const [activeTab, setActiveTab] = useState<'search' | 'ask'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // RAG Q&A State
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<any[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const askInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (activeTab === 'search') {
          searchInputRef.current?.focus();
        } else {
          askInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTab]);

  // Keyboard navigation within search results
  useEffect(() => {
    if (activeTab !== 'search') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev < results.length - 1 ? prev + 1 : prev;
          document.getElementById(`search-result-${next}`)?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          document.getElementById(`search-result-${next}`)?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(`/knowledge/${results[selectedIndex].id}`);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, navigate, activeTab]);

  // Debounced semantic search
  useEffect(() => {
    if (activeTab !== 'search') return;

    async function doSearch() {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      setSelectedIndex(0);
      
      try {
        const allConcepts = await KnowledgeService.getAll();
        
        let searchData = [];
        try {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, concepts: allConcepts })
          });
          
          if (!response.ok) throw new Error('API failed');
          searchData = await response.json();
        } catch (apiErr) {
          console.warn('Semantic search failed, falling back to local keyword search', apiErr);
          const queryLower = query.toLowerCase();
          searchData = allConcepts.filter(c => 
            c.title.toLowerCase().includes(queryLower) || 
            (c.summary && c.summary.toLowerCase().includes(queryLower))
          ).map(c => ({
            ...c,
            matchReason: c.title.toLowerCase() === queryLower ? 'Exact match (Fallback)' : 'Keyword match (Fallback)'
          }));
        }

        setResults(searchData);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }
    
    const timer = setTimeout(() => {
      doSearch();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, activeTab]);

  // Handle RAG Ask Vault
  const handleAskVault = async (questionToAsk?: string) => {
    const q = (questionToAsk || ragQuestion).trim();
    if (!q) return;

    setRagLoading(true);
    setRagError(null);
    setRagAnswer(null);
    setRagSources([]);

    try {
      const allConcepts = await KnowledgeService.getAll();
      if (allConcepts.length === 0) {
        setRagError('Your vault is empty. Add some concepts first to ask questions.');
        setRagLoading(false);
        return;
      }

      // Fetch enriched concepts with their relationships for Graph-RAG
      const enriched = await Promise.all(
        allConcepts.map(async (c) => ({
          ...c,
          relatedConcepts: await KnowledgeService.getRelatedConcepts(c.id)
        }))
      );

      const response = await fetch('/api/rag-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, concepts: enriched })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get answer from vault');
      }

      const data = await response.json();
      setRagAnswer(data.answer);
      setRagSources(data.sources || []);
    } catch (err: any) {
      console.error('RAG ask error:', err);
      setRagError(err.message || 'An error occurred while synthesizing the answer.');
    } finally {
      setRagLoading(false);
    }
  };

  const switchAndAsk = (q: string) => {
    setActiveTab('ask');
    setRagQuestion(q);
    handleAskVault(q);
  };

  // Helper to parse markdown links [title](/knowledge/id)
  const renderFormattedText = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const paragraphs = text.split('\n\n');

    return paragraphs.map((p, pIdx) => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(p)) !== null) {
        if (match.index > lastIndex) {
          parts.push(p.substring(lastIndex, match.index));
        }
        const linkTitle = match[1];
        const linkUrl = match[2];
        parts.push(
          <Link
            key={`${pIdx}-${match.index}`}
            to={linkUrl}
            style={{
              color: 'var(--color-accent-terracotta)',
              textDecoration: 'underline',
              fontWeight: 500
            }}
          >
            {linkTitle}
          </Link>
        );
        lastIndex = linkRegex.lastIndex;
      }

      if (lastIndex < p.length) {
        parts.push(p.substring(lastIndex));
      }

      return (
        <p key={pIdx} style={{ margin: '0 0 0.85rem 0', lineHeight: 1.65, fontSize: '0.98rem' }}>
          {parts}
        </p>
      );
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', paddingTop: '1rem' }}>
      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            fontWeight: activeTab === 'search' ? 600 : 400,
            color: activeTab === 'search' ? 'var(--color-accent-terracotta)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'search' ? '2px solid var(--color-accent-terracotta)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Semantic Search
        </button>
        <button
          onClick={() => setActiveTab('ask')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            fontWeight: activeTab === 'ask' ? 600 : 400,
            color: activeTab === 'ask' ? 'var(--color-accent-terracotta)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'ask' ? '2px solid var(--color-accent-terracotta)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span>✨</span> Ask Vault (RAG)
        </button>
      </div>

      {activeTab === 'search' ? (
        /* ─── Search Mode ─────────────────────────────────────────── */
        <>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <input 
              ref={searchInputRef}
              type="text" 
              className="search-input"
              placeholder="Search concepts or mental models (press '/' to focus)" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{ width: '100%' }}
            />
          </div>

          {query.trim().length > 3 && (
            <div style={{ marginBottom: '1.25rem', textAlign: 'right' }}>
              <button
                onClick={() => switchAndAsk(query)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent-terracotta)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                ✨ Want an AI synthesis? Ask your vault: "{query}" →
              </button>
            </div>
          )}
          
          {loading ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Searching...</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {results.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Link 
                    id={`search-result-${index}`}
                    key={item.id} 
                    to={`/knowledge/${item.id}`} 
                    style={{ textDecoration: 'none' }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div 
                      className="card"
                      style={{ 
                        border: isSelected ? '2px solid var(--color-accent-terracotta)' : '1px solid var(--color-border)',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.1s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--color-text-obsidian)' }}>
                          {item.title}
                        </h3>
                        {item.matchReason && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
                            {item.matchReason}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {item.summary}
                      </p>
                      
                      {isSelected && (
                        <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-accent-terracotta)', fontWeight: 'bold' }}>
                          ↵
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
              {query.trim() && results.length === 0 && !loading && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    No concepts found matching "{query}"
                  </p>
                  <button
                    onClick={() => switchAndAsk(query)}
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-accent-terracotta)',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                  >
                    ✨ Try Asking Vault with RAG
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* ─── Ask Vault (RAG) Mode ────────────────────────────────── */
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              ref={askInputRef}
              type="text"
              className="search-input"
              placeholder="Ask anything across your knowledge vault (e.g. 'How do my ideas on models connect?')"
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAskVault();
                }
              }}
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              onClick={() => handleAskVault()}
              disabled={ragLoading || !ragQuestion.trim()}
              style={{
                backgroundColor: 'var(--color-accent-terracotta)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: ragLoading || !ragQuestion.trim() ? 'not-allowed' : 'pointer',
                opacity: ragLoading || !ragQuestion.trim() ? 0.6 : 1,
                whiteSpace: 'nowrap'
              }}
            >
              {ragLoading ? 'Synthesizing…' : 'Ask Vault'}
            </button>
          </div>

          {ragLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🧠</div>
              <p style={{ margin: 0 }}>Retrieving relevant concepts & traversing knowledge graph…</p>
            </div>
          )}

          {ragError && (
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {ragError}
            </div>
          )}

          {ragAnswer && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Synthesized Answer Card */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.75rem',
                  backgroundColor: 'var(--color-card-bg)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-accent-terracotta)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>✨</span>
                  <span>Synthesized Answer</span>
                </div>
                
                <div style={{ color: 'var(--color-text-obsidian)' }}>
                  {renderFormattedText(ragAnswer)}
                </div>

                {/* Sources / Grounding Badges */}
                {ragSources.length > 0 && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                      Grounded in {ragSources.length} concept{ragSources.length > 1 ? 's' : ''} from your vault:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {ragSources.map((s) => (
                        <Link
                          key={s.id}
                          to={`/knowledge/${s.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '1rem',
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.82rem',
                            color: 'var(--color-text-obsidian)',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{s.title}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-accent-terracotta)' }}>
                            {Math.round(s.similarity * 100)}% match
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
