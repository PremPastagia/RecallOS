import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import type { KnowledgeItem } from '../lib/types';

export function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        const data = await KnowledgeService.getById(id);
        setItem(data || null);
      } catch (err) {
        console.error('Failed to load knowledge detail', err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  if (loading) return <div style={{ color: 'var(--color-text-secondary)' }}>Loading concept...</div>;
  
  if (!item) return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h2 style={{ color: 'var(--color-text)' }}>Concept not found</h2>
      <Link to="/" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>Return to Home</Link>
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Back
      </Link>
      
      <article>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 600, margin: '0 0 1rem 0', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          {item.title}
        </h1>
        
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 3rem 0', borderLeft: '3px solid var(--color-accent-terracotta)', paddingLeft: '1.5rem' }}>
          {item.summary}
        </p>

        <div style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
          {item.fullContent}
        </div>

        {item.relatedConcepts && item.relatedConcepts.length > 0 && (
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '1rem' }}>Related Concepts</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {item.relatedConcepts.map(related => (
                <Link 
                  key={related.id} 
                  to={`/knowledge/${related.id}`}
                  style={{ 
                    backgroundColor: 'var(--color-bg)', 
                    border: '1px solid var(--color-border)',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.9rem'
                  }}
                >
                  {related.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
