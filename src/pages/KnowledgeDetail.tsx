import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { ConceptMap } from '../components/ConceptMap';
import type { KnowledgeItem } from '../lib/types';

export function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        setLoading(true);
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

  // Helper to render markdown links like [Concept](/knowledge/id) cleanly
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    
    // Split by markdown link pattern [text](/knowledge/id)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const label = match[1];
      const url = match[2];
      parts.push(
        <Link
          key={match.index}
          to={url}
          style={{
            color: 'var(--color-accent-terracotta)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            fontWeight: 500
          }}
        >
          {label}
        </Link>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  if (loading) return <div style={{ color: 'var(--color-text-secondary)', marginTop: '2rem' }}>Loading concept...</div>;
  
  if (!item) return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h2 style={{ color: 'var(--color-text-obsidian)' }}>Concept not found</h2>
      <Link to="/" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>Return to Home</Link>
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Back to Queue
      </Link>
      
      <article>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 600, margin: '0 0 1rem 0', color: 'var(--color-text-obsidian)', letterSpacing: '-0.02em' }}>
          {item.title}
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          margin: '0 0 3rem 0',
          borderLeft: '3px solid var(--color-accent-terracotta)',
          paddingLeft: '1.5rem'
        }}>
          {item.summary}
        </p>

        <div style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--color-text-obsidian)', whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>
          {renderFormattedContent(item.fullContent)}
        </div>

        {/* Lightweight Visual Relationship Map */}
        <ConceptMap
          currentConceptId={item.id}
          currentConceptTitle={item.title}
          relatedConcepts={item.relatedConcepts || []}
        />
      </article>
    </div>
  );
}
