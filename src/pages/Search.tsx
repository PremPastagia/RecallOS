import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Keyboard navigation within results
  useEffect(() => {
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
    
    // Only listen if we have focus in the search box or document body
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, navigate]);

  useEffect(() => {
    async function doSearch() {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      setSelectedIndex(0); // Reset selection on new search
      
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
          // Fallback: local keyword search
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
  }, [query]);

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <input 
          ref={searchInputRef}
          type="text" 
          className="search-input"
          placeholder="Search for a concept (press '/' to focus)" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{ width: '100%' }}
        />
      </div>
      
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
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--color-text)' }}>
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
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              No concepts found matching "{query}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
