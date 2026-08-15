import React, { useState, useEffect } from 'react';
import { KnowledgeService } from '../lib/dataService';
import type { KnowledgeItem, RelatedConcept } from '../lib/types';

interface ConnectionManagerProps {
  currentConceptId: string;
  currentConceptTitle: string;
  currentConceptSummary: string;
  existingConnections: RelatedConcept[];
  onConnectionAdded: () => void;
  onConnectionRemoved: () => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  currentConceptId,
  currentConceptTitle,
  currentConceptSummary,
  existingConnections,
  onConnectionAdded,
  onConnectionRemoved
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeItem[]>([]);
  const [suggestions, setSuggestions] = useState<KnowledgeItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Fetch suggestions
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const allConcepts = await KnowledgeService.getAll();
        
        // Semantic search API call
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: `${currentConceptTitle} ${currentConceptSummary}`, 
            concepts: allConcepts 
          })
        });

        if (res.ok) {
          const data = await res.json();
          // Filter out itself and existing connections
          const existingIds = new Set(existingConnections.map(c => c.id));
          const validSuggestions = data
            .filter((c: any) => c.id !== currentConceptId && !existingIds.has(c.id))
            .slice(0, 3); // top 3
            
          setSuggestions(validSuggestions);
        }
      } catch (err) {
        console.error('Failed to load semantic suggestions', err);
      }
    }
    fetchSuggestions();
  }, [currentConceptId, currentConceptTitle, currentConceptSummary, existingConnections]);

  // Handle manual search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        return;
      }
      setLoadingSearch(true);
      try {
        const results = await KnowledgeService.search(searchQuery);
        const existingIds = new Set(existingConnections.map(c => c.id));
        setSearchResults(results.filter(c => c.id !== currentConceptId && !existingIds.has(c.id)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentConceptId, existingConnections]);

  const handleAddConnection = async (targetId: string) => {
    try {
      await KnowledgeService.addConnection(currentConceptId, targetId);
      setSearchQuery('');
      onConnectionAdded();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveConnection = async (targetId: string) => {
    try {
      await KnowledgeService.removeConnection(currentConceptId, targetId);
      onConnectionRemoved();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 500, margin: '0 0 1rem 0', color: 'var(--color-text-obsidian)' }}>
        Manage Connections
      </h3>

      {/* Existing Connections List with Unlink */}
      {existingConnections.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Links</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {existingConnections.map(conn => (
              <div key={conn.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.4rem 0.8rem', 
                backgroundColor: 'var(--color-bg-ivory)', 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem'
              }}>
                <span style={{ color: 'var(--color-text-obsidian)' }}>{conn.title}</span>
                <button 
                  onClick={() => handleRemoveConnection(conn.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    padding: '0 0.2rem',
                    fontSize: '1rem',
                    lineHeight: 1
                  }}
                  title="Remove Connection"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semantic Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--color-accent-terracotta)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✨ Semantic Suggestions</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {suggestions.map(s => (
              <button 
                key={s.id} 
                onClick={() => handleAddConnection(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.8rem',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--color-accent-terracotta)',
                  color: 'var(--color-accent-terracotta)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                + {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Search */}
      <div>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Link Existing Concept</h4>
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search vault to link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.8rem 1rem', 
              fontSize: '1rem', 
              backgroundColor: 'var(--color-bg-ivory)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 'var(--radius-md)',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: 'var(--color-card-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 10
            }}>
              {loadingSearch ? (
                <div style={{ padding: '1rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(res => (
                  <button
                    key={res.id}
                    onClick={() => handleAddConnection(res.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.8rem 1rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    <div style={{ fontWeight: 500, color: 'var(--color-text-obsidian)' }}>{res.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.summary}</div>
                  </button>
                ))
              ) : (
                <div style={{ padding: '1rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>No available unlinked concepts found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
