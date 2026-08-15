import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/mockData';

export function Search() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    return KnowledgeService.search(query);
  }, [query]);

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div className="search-container" style={{ width: '100%', maxWidth: '100%' }}>
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search your knowledge vault..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      
      <div style={{ marginTop: '3rem' }}>
        {query.trim() === '' ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Begin typing to explore your connected concepts.
          </p>
        ) : results.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No concepts found matching "{query}".
          </p>
        ) : (
          <div className="queue-grid" style={{ gridTemplateColumns: '1fr' }}>
            {results.map((concept) => (
              <Link to={`/knowledge/${concept.id}`} key={concept.id} className="concept-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 className="concept-title" style={{ marginBottom: '0.2rem' }}>{concept.title}</h3>
                  <p className="concept-summary" style={{ margin: 0 }}>{concept.summary}</p>
                </div>
                <div className="ring-icon" style={{ opacity: Math.max(0.3, concept.reviewState.strength) }}></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
