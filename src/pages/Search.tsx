import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import type { KnowledgeItem } from '../lib/types';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function doSearch() {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch all concepts with embeddings to perform fallback similarity search
        const allConcepts = await KnowledgeService.getAll();
        
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, concepts: allConcepts })
        });
        
        if (!response.ok) throw new Error('Semantic search failed');
        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }
    
    // Simple debounce
    const timer = setTimeout(() => {
      doSearch();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <input 
        type="text" 
        className="search-input"
        placeholder="Search your knowledge base..." 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', marginBottom: '2rem' }}
      />
      
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Searching...</p>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {results.map(item => (
            <Link key={item.id} to={`/knowledge/${item.id}`} style={{ textDecoration: 'none' }}>
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--color-text)' }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {item.summary}
                </p>
              </div>
            </Link>
          ))}
          {query.trim() && results.length === 0 && !loading && (
            <p style={{ color: 'var(--color-text-secondary)' }}>No concepts found matching "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}
